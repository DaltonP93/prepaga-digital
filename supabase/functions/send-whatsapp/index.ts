import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  to: string;
  templateName: string;
  templateData: Record<string, string>;
  saleId?: string;
  companyId: string;
  messageType?: 'signature_link' | 'questionnaire' | 'reminder' | 'general';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { to, templateName, templateData, saleId, companyId, messageType = 'general' }: WhatsAppRequest = await req.json()

    // Validate required fields
    if (!to || !companyId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: to, companyId'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get company WhatsApp settings
    const { data: companySettings, error: settingsError } = await supabase
      .from('company_settings')
      .select('whatsapp_api_key, whatsapp_phone_id')
      .eq('company_id', companyId)
      .single()

    if (settingsError || !companySettings?.whatsapp_api_key) {
      console.error('Company WhatsApp settings not found:', settingsError)
      
      // Log the failed attempt
      await supabase.from('whatsapp_messages').insert({
        sale_id: saleId,
        phone_number: to,
        message_type: messageType,
        message_body: buildMessageFromTemplate(templateName, templateData),
        status: 'failed',
        error_message: 'WhatsApp API key not configured for this company',
        company_id: companyId,
      })

      return new Response(JSON.stringify({
        success: false,
        error: 'WhatsApp not configured for this company'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Build message from template
    const message = buildMessageFromTemplate(templateName, templateData)

    // Send via WhatsApp Business API (Meta Graph API)
    const whatsappResponse = await sendWhatsAppMessage(
      companySettings.whatsapp_api_key,
      companySettings.whatsapp_phone_id,
      to,
      message
    )

    // Log the message
    const { data: messageLog, error: logError } = await supabase
      .from('whatsapp_messages')
      .insert({
        sale_id: saleId,
        phone_number: to,
        message_type: messageType,
        message_body: message,
        status: whatsappResponse.success ? 'sent' : 'failed',
        error_message: whatsappResponse.error || null,
        whatsapp_message_id: whatsappResponse.messageId || null,
        company_id: companyId,
        sent_at: whatsappResponse.success ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging WhatsApp message:', logError)
    }

    return new Response(JSON.stringify({
      success: whatsappResponse.success,
      messageId: whatsappResponse.messageId,
      logId: messageLog?.id,
      error: whatsappResponse.error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Build message from template
function buildMessageFromTemplate(templateName: string, data: Record<string, string>): string {
  const templates: Record<string, string> = {
    signature_link: `Hola {{clientName}}, tu contrato está listo para firma digital.

📝 Por favor, accede al siguiente enlace para firmar tu documentación:
{{signatureUrl}}

⏰ Este enlace expira el {{expirationDate}}.

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
{{companyName}}`,

    questionnaire: `Hola {{clientName}}, necesitamos que completes un breve cuestionario para continuar con tu proceso.

📋 Accede aquí: {{questionnaireUrl}}

Este paso es necesario para procesar tu solicitud.

Saludos,
{{companyName}}`,

    reminder: `Hola {{clientName}}, te recordamos que tienes documentos pendientes de firma.

📝 Enlace de firma: {{signatureUrl}}

⚠️ Este enlace expira el {{expirationDate}}.

No pierdas tu lugar, firma ahora.

Saludos,
{{companyName}}`,

    approval: `🎉 ¡Felicitaciones {{clientName}}!

Tu solicitud ha sido aprobada exitosamente.

📄 Número de contrato: {{contractNumber}}
💰 Plan: {{planName}}

Pronto recibirás más información sobre tu cobertura.

Gracias por confiar en nosotros.
{{companyName}}`,

    rejection: `Hola {{clientName}},

Lamentamos informarte que tu solicitud no pudo ser aprobada en esta ocasión.

{{rejectionReason}}

Si deseas más información, por favor contáctanos.

Saludos,
{{companyName}}`,

    general: `Hola {{clientName}},

{{message}}

Saludos,
{{companyName}}`,
  }

  let message = templates[templateName] || templates.general
  
  // Replace placeholders with actual data
  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
  })

  return message
}

// Send message via WhatsApp Business API
async function sendWhatsAppMessage(
  apiKey: string,
  phoneId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Format phone number (remove + and spaces)
    const formattedPhone = to.replace(/[\s+\-()]/g, '')

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message
          }
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', result)
      return {
        success: false,
        error: result.error?.message || 'Failed to send WhatsApp message'
      }
    }

    return {
      success: true,
      messageId: result.messages?.[0]?.id
    }
  } catch (error) {
    console.error('Error calling WhatsApp API:', error)
    return {
      success: false,
      error: error.message || 'Network error sending WhatsApp message'
    }
  }
}
