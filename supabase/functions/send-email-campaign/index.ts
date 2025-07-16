import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
    const { campaignId, recipients, subject, content, companyId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    let sentCount = 0;

    // Enviar emails a cada destinatario
    for (const recipient of recipients) {
      try {
        const emailResponse = await resend.emails.send({
          from: "Sistema de Comunicación <noreply@resend.dev>",
          to: [recipient.email],
          subject: subject,
          html: content.replace(/\{\{nombre\}\}/g, recipient.name || recipient.email),
        });

        // Registrar en communication_logs
        await supabase
          .from('communication_logs')
          .insert({
            type: 'email',
            recipient_id: recipient.id,
            recipient_email: recipient.email,
            campaign_id: campaignId,
            subject: subject,
            content: content,
            status: 'sent',
            sent_at: new Date().toISOString(),
            company_id: companyId
          });

        results.push({ email: recipient.email, status: 'sent', messageId: emailResponse.data?.id });
        sentCount++;
      } catch (error) {
        console.error(`Error enviando email a ${recipient.email}:`, error);
        
        // Registrar error en communication_logs
        await supabase
          .from('communication_logs')
          .insert({
            type: 'email',
            recipient_id: recipient.id,
            recipient_email: recipient.email,
            campaign_id: campaignId,
            subject: subject,
            content: content,
            status: 'failed',
            error_message: error.message,
            company_id: companyId
          });

        results.push({ email: recipient.email, status: 'failed', error: error.message });
      }
    }

    // Actualizar estadísticas de la campaña
    await supabase
      .from('email_campaigns')
      .update({
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .eq('id', campaignId);

    return new Response(JSON.stringify({ 
      success: true, 
      results, 
      totalSent: sentCount,
      totalRecipients: recipients.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error en send-email-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});