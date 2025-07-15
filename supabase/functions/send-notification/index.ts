
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json();

    let subject = "";
    let html = "";

    switch (type) {
      case 'signature_request':
        subject = "Documento listo para su firma";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Documento listo para firma</h1>
            <p>Estimado/a ${data.clientName},</p>
            <p>Su documento para el plan <strong>${data.planName}</strong> está listo para su firma digital.</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <a href="${data.signatureUrl}" 
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Firmar Documento
              </a>
            </div>
            <p><strong>Importante:</strong> Este enlace expira el ${new Date(data.expiresAt).toLocaleDateString('es-ES')}.</p>
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
            <p>El cliente <strong>${data.clientName}</strong> ha firmado exitosamente el documento.</p>
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Plan:</strong> ${data.planName}</p>
              <p><strong>Monto:</strong> €${data.totalAmount}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <p>Puede ver los detalles completos en su panel de administración.</p>
          </div>
        `;
        break;

      default:
        throw new Error('Tipo de notificación no válido');
    }

    const emailResponse = await resend.emails.send({
      from: "Sistema de Firmas <noreply@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
