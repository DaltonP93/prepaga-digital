import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, recipients, message, companyId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    let sentCount = 0;

    // Simular envío de SMS (en producción usarías Twilio u otro servicio)
    for (const recipient of recipients) {
      try {
        // Simulación de envío exitoso
        const success = Math.random() > 0.1; // 90% de éxito
        
        if (success) {
          // Registrar en communication_logs
          await supabase
            .from('communication_logs')
            .insert({
              type: 'sms',
              recipient_id: recipient.id,
              recipient_phone: recipient.phone,
              campaign_id: campaignId,
              content: message.replace(/\{\{nombre\}\}/g, recipient.name || recipient.phone),
              status: 'sent',
              sent_at: new Date().toISOString(),
              delivered_at: new Date().toISOString(),
              company_id: companyId
            });

          results.push({ phone: recipient.phone, status: 'sent', messageId: `sms_${Date.now()}_${Math.random()}` });
          sentCount++;
        } else {
          throw new Error('Número no válido o no disponible');
        }
      } catch (error) {
        console.error(`Error enviando SMS a ${recipient.phone}:`, error);
        
        // Registrar error en communication_logs
        await supabase
          .from('communication_logs')
          .insert({
            type: 'sms',
            recipient_id: recipient.id,
            recipient_phone: recipient.phone,
            campaign_id: campaignId,
            content: message,
            status: 'failed',
            error_message: error.message,
            company_id: companyId
          });

        results.push({ phone: recipient.phone, status: 'failed', error: error.message });
      }
    }

    // Actualizar estadísticas de la campaña
    await supabase
      .from('sms_campaigns')
      .update({
        sent_count: sentCount,
        delivered_count: sentCount, // En simulación asumimos que todos los enviados son entregados
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
    console.error("Error en send-sms-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});