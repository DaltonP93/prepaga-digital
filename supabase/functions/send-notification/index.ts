import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { escapeHtml } from "../_shared/html-sanitizer.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Roles allowed to send notifications
const ALLOWED_ROLES = ['super_admin', 'admin', 'gestor', 'supervisor'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Role check: only allowed roles can send notifications
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = (roles || []).map((r: any) => r.role);
    const hasPermission = userRoles.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, to, data } = await req.json();

    // Validate recipient: must be a valid email belonging to a client in the user's company
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (profile?.company_id) {
      // Verify recipient belongs to the user's company
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('email', to)
        .limit(1)
        .single();

      if (!client) {
        return new Response(JSON.stringify({ error: "Recipient not found in your company's clients" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Sanitize all user-supplied data
    const safeClientName = escapeHtml(data?.clientName || '');
    const safePlanName = escapeHtml(data?.planName || '');
    const safeTotalAmount = escapeHtml(String(data?.totalAmount || ''));

    // Validate signatureUrl: must be a valid URL from our domain
    let safeSignatureUrl = '#';
    if (data?.signatureUrl && typeof data.signatureUrl === 'string') {
      try {
        const url = new URL(data.signatureUrl);
        if (['http:', 'https:'].includes(url.protocol)) {
          safeSignatureUrl = url.toString();
        }
      } catch {
        // Invalid URL, keep default
      }
    }

    let subject = "";
    let html = "";

    switch (type) {
      case 'signature_request':
        subject = "Documento listo para su firma";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Documento listo para firma</h1>
            <p>Estimado/a ${safeClientName},</p>
            <p>Su documento para el plan <strong>${safePlanName}</strong> está listo para su firma digital.</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <a href="${safeSignatureUrl}" 
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Firmar Documento
              </a>
            </div>
            <p><strong>Importante:</strong> Este enlace expira el ${data?.expiresAt ? new Date(data.expiresAt).toLocaleDateString('es-ES') : 'N/A'}.</p>
            <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Este es un mensaje automático, por favor no responda a este email.
            </p>
          </div>
        `;
        break;

      case 'signature_completed':
        subject = "Documento firmado exitosamente";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #28a745;">¡Documento firmado!</h1>
            <p>El cliente <strong>${safeClientName}</strong> ha firmado exitosamente el documento.</p>
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Plan:</strong> ${safePlanName}</p>
              <p><strong>Monto:</strong> €${safeTotalAmount}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <p>Puede ver los detalles completos en su panel de administración.</p>
          </div>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Tipo de notificación no válido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const emailResponse = await resend.emails.send({
      from: "Sistema de Firmas <noreply@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });


    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
