import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Authenticate the caller - must be admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify caller identity
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller is an admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['admin', 'super_admin'])
      .limit(1)

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let requestBody;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty request body');
      }
      requestBody = JSON.parse(text);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = requestBody.email;
    const password = requestBody.password;
    const firstName = requestBody.firstName || requestBody.first_name;
    const lastName = requestBody.lastName || requestBody.last_name;
    const phone = requestBody.phone || null;
    const role = requestBody.role || 'vendedor';
    const companyId = requestBody.companyId || requestBody.company_id || null;

    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, firstName, lastName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user account', details: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed - no user data returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    try {
      // Insert profile directly (service role bypasses RLS)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          company_id: companyId,
          is_active: true,
        });

      if (profileError) {
        console.error('Profile insert error:', profileError);
        throw profileError;
      }

      // Insert user role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role,
        });

      if (roleError) {
        console.error('Role insert error:', roleError);
        throw roleError;
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          user: { id: userId, email: email }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (profileError) {
      console.error('Profile/role creation failed:', profileError);
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile', details: String(profileError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
