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
    // Authenticate the request
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
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaignId, recipients, subject, content, companyId } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    let sentCount = 0;

    for (const recipient of recipients) {
      try {
        const emailResponse = await resend.emails.send({
          from: "Sistema de Comunicación <noreply@resend.dev>",
          to: [recipient.email],
          subject: subject,
          html: content.replace(/\{\{nombre\}\}/g, recipient.name || recipient.email),
        });

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
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error en send-email-campaign:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
