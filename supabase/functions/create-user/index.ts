import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse, getClientIdentifier } from "../_shared/rate-limiter.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - strict for user creation
    const clientIp = getClientIdentifier(req)
    const rateCheck = checkRateLimit(`create-user:${clientIp}`, { windowMs: 15 * 60 * 1000, maxRequests: 20 })
    if (!rateCheck.allowed) {
      return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs)
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    let requestBody;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        requestBody = {};
      } else {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { count: superAdminCount, error: superAdminCountError } = await supabaseAdmin
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin');

    if (superAdminCountError) {
      return new Response(
        JSON.stringify({ error: 'No se pudo verificar el estado de super admin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const canBootstrap = (superAdminCount ?? 0) === 0;

    if (requestBody.action === 'can_bootstrap_super_admin') {
      return new Response(
        JSON.stringify({ success: true, canBootstrap }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requestBody.action === 'bootstrap_super_admin') {
      if (!canBootstrap) {
        return new Response(
          JSON.stringify({ error: 'El super admin inicial ya fue creado' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Require a bootstrap secret for production safety
      const bootstrapSecret = Deno.env.get('BOOTSTRAP_SECRET')
      if (bootstrapSecret) {
        const providedSecret = requestBody.bootstrap_secret
        if (!providedSecret || providedSecret !== bootstrapSecret) {
          return new Response(
            JSON.stringify({ error: 'Invalid or missing bootstrap secret' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const email = requestBody.email;
      const password = requestBody.password;
      const firstName = requestBody.firstName || requestBody.first_name;
      const lastName = requestBody.lastName || requestBody.last_name;
      const phone = requestBody.phone || null;

      if (!email || !password || !firstName || !lastName) {
        return new Response(
          JSON.stringify({ error: 'Faltan campos obligatorios para bootstrap inicial' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'super_admin',
        },
      });

      if (authError || !authData.user) {
        return new Response(
          JSON.stringify({ error: 'No se pudo crear el super admin inicial', details: authError?.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = authData.user.id;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          company_id: null,
          is_active: true,
        });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: 'No se pudo crear perfil del super admin', details: profileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'super_admin',
        });

      if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: 'No se pudo asignar rol super_admin', details: roleError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Super admin inicial creado',
          user: { id: userId, email },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authenticate the caller - must be admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Handle password reset action
    if (requestBody.action === 'reset_password') {
      const targetUserId = requestBody.user_id;
      const newPassword = requestBody.new_password;

      if (!targetUserId || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: user_id, new_password' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update password', details: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original create user flow
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
      // Update profile (trigger already created it)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          company_id: companyId,
          is_active: true,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Delete existing roles then insert the correct one
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
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
      const errorDetails = profileError instanceof Error ? profileError.message : JSON.stringify(profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile', details: errorDetails }),
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
