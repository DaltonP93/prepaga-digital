
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create user function called');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '')
    
    console.log('Verifying auth token...');
    
    // Verify the user making the request
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Auth verified, checking permissions...');

    // Check if user has permission to create users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['super_admin', 'admin'].includes(profile.role)) {
      console.error('Insufficient permissions:', profile.role);
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Permissions verified, parsing request body...');

    const requestBody = await req.json();
    const { email, password, first_name, last_name, role, company_id } = requestBody;

    console.log('Request data received:', { email, first_name, last_name, role, company_id });

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      console.error('Missing required fields:', { email: !!email, password: !!password, first_name: !!first_name, last_name: !!last_name, role: !!role });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: 'email, password, first_name, last_name, and role are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'gestor', 'vendedor'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid role provided',
        details: `Role must be one of: ${validRoles.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Creating user with data:', { email, first_name, last_name, role, company_id });

    // Create user with admin privileges
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role
      }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create user: ' + createError.message,
        details: createError
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Auth user created, creating profile...');

    // Create profile directly using insert without specifying role type
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        first_name,
        last_name,
        role: role, // Let the database handle the type conversion
        company_id: company_id || null,
        active: true
      });

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // If profile creation fails, we should delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ 
        error: 'Failed to create user profile: ' + profileInsertError.message, 
        details: profileInsertError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User created successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      user: authData.user,
      message: 'User created successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + error.message,
      details: error 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
