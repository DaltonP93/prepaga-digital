import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse, getClientIdentifier } from "../_shared/rate-limiter.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppRequest {
  to: string;
  templateName: string;
  templateKey?: string;
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
    // Rate limiting for messaging
    const clientIp = getClientIdentifier(req)
    const rateCheck = checkRateLimit(`whatsapp:${clientIp}`, { windowMs: 5 * 60 * 1000, maxRequests: 50 })
    if (!rateCheck.allowed) {
      return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs)
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authenticate the request
    const authHeader = req.headers.get('Authorization')
    const isInternalCall = authHeader === `Bearer ${supabaseServiceKey}`

    if (!isInternalCall) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user }, error: userError } = await anonClient.auth.getUser()
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { to, templateName, templateKey, templateData, saleId, companyId, messageType = 'general' }: WhatsAppRequest = await req.json()

    if (!to || !companyId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: to, companyId'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get company WhatsApp settings including provider + WAHA fields
    const { data: companySettings, error: settingsError } = await supabase
      .from('company_settings')
      .select('whatsapp_api_key, whatsapp_phone_id, whatsapp_provider, whatsapp_gateway_url, whatsapp_linked_phone, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('company_id', companyId)
      .single()

    const provider = companySettings?.whatsapp_provider || 'wame_fallback'

    // Build message: prefer whatsapp_templates table, then email_templates with channel=whatsapp, then built-in
    let message: string
    const resolvedKey = templateKey || templateName
    let templateFound = false

    // 1. Check whatsapp_templates table first
    if (resolvedKey) {
      try {
        const { data: waTpl } = await supabase
          .from('whatsapp_templates')
          .select('message_body')
          .eq('company_id', companyId)
          .eq('template_key', resolvedKey)
          .eq('is_active', true)
          .single()
        if (waTpl?.message_body) {
          message = waTpl.message_body
          Object.entries(templateData).forEach(([key, value]) => {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
          })
          templateFound = true
        }
      } catch { /* not found, continue */ }
    }

    // 2. Fallback to email_templates with channel=whatsapp
    if (!templateFound && resolvedKey) {
      try {
        const { data: customTpl } = await supabase
          .from('email_templates')
          .select('body')
          .eq('company_id', companyId)
          .eq('template_key', resolvedKey)
          .eq('channel', 'whatsapp')
          .eq('is_active', true)
          .single()
        if (customTpl?.body) {
          message = customTpl.body
          Object.entries(templateData).forEach(([key, value]) => {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
          })
          templateFound = true
        }
      } catch { /* not found, continue */ }
    }

    // 3. Fallback to built-in template
    if (!templateFound) {
      message = buildMessageFromTemplate(templateName, templateData)
    }

    // Route by provider
    if (provider === 'wame_fallback' || (!companySettings && provider !== 'meta' && provider !== 'twilio')) {
      // wa.me fallback: return URL for frontend to open
      const formattedPhone = to.replace(/[\s+\-()]/g, '')
      const wameUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`

      // Log the message attempt
      await supabase.from('whatsapp_messages').insert({
        sale_id: saleId,
        phone_number: to,
        message_type: messageType,
        message_body: message,
        status: 'manual',
        company_id: companyId,
      })

      return new Response(JSON.stringify({
        success: true,
        fallback: true,
        provider: 'wame_fallback',
        wameUrl,
        message,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (provider === 'twilio') {
      // Twilio WhatsApp
      if (!companySettings?.twilio_account_sid || !companySettings?.twilio_auth_token || !companySettings?.twilio_whatsapp_number) {
        await supabase.from('whatsapp_messages').insert({
          sale_id: saleId,
          phone_number: to,
          message_type: messageType,
          message_body: message,
          status: 'failed',
          error_message: 'Twilio credentials not configured',
          company_id: companyId,
        })

        return new Response(JSON.stringify({
          success: false,
          error: 'Twilio not configured for this company'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const twilioResult = await sendViaTwilio(
        companySettings.twilio_account_sid,
        companySettings.twilio_auth_token,
        companySettings.twilio_whatsapp_number,
        to,
        message
      )

      await supabase.from('whatsapp_messages').insert({
        sale_id: saleId,
        phone_number: to,
        message_type: messageType,
        message_body: message,
        status: twilioResult.success ? 'sent' : 'failed',
        error_message: twilioResult.error || null,
        whatsapp_message_id: twilioResult.messageId || null,
        company_id: companyId,
        sent_at: twilioResult.success ? new Date().toISOString() : null,
      })

      return new Response(JSON.stringify({
        success: twilioResult.success,
        provider: 'twilio',
        messageId: twilioResult.messageId,
        error: twilioResult.error,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: twilioResult.success ? 200 : 500,
      })
    }

    if (provider === 'waha' || provider === 'qr_session') {
      // WAHA (WhatsApp HTTP API) self-hosted gateway
      const gatewayUrl = companySettings?.whatsapp_gateway_url
      const apiToken = companySettings?.whatsapp_api_key || Deno.env.get('WAHA_API_KEY') || ''

      if (!gatewayUrl) {
        await supabase.from('whatsapp_messages').insert({
          sale_id: saleId,
          phone_number: to,
          message_type: messageType,
          message_body: message,
          status: 'failed',
          error_message: 'WAHA gateway URL not configured',
          company_id: companyId,
        })

        return new Response(JSON.stringify({
          success: false,
          error: 'WAHA gateway not configured for this company'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const wahaResult = await sendViaWAHA(gatewayUrl, apiToken || '', to, message)

      await supabase.from('whatsapp_messages').insert({
        sale_id: saleId,
        phone_number: to,
        message_type: messageType,
        message_body: message,
        status: wahaResult.success ? 'sent' : 'failed',
        error_message: wahaResult.error || null,
        whatsapp_message_id: wahaResult.messageId || null,
        company_id: companyId,
        sent_at: wahaResult.success ? new Date().toISOString() : null,
      })

      return new Response(JSON.stringify({
        success: wahaResult.success,
        provider: 'waha',
        messageId: wahaResult.messageId,
        error: wahaResult.error,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: wahaResult.success ? 200 : 500,
      })
    }

    // Default: Meta Business API
    if (!companySettings?.whatsapp_api_key || !companySettings?.whatsapp_phone_id) {
      // Fallback to wa.me link instead of failing
      console.warn('Meta API not configured, falling back to wa.me link')
      const formattedPhone = to.replace(/[\s+\-()]/g, '')
      const wameUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`

      await supabase.from('whatsapp_messages').insert({
        sale_id: saleId,
        phone_number: to,
        message_type: messageType,
        message_body: message,
        status: 'manual',
        company_id: companyId,
      })

      return new Response(JSON.stringify({
        success: true,
        fallback: true,
        provider: 'wame_fallback',
        wameUrl,
        message,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const whatsappResponse = await sendViaMetaAPI(
      companySettings.whatsapp_api_key,
      companySettings.whatsapp_phone_id,
      to,
      message
    )

    const { data: messageLog } = await supabase
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

    return new Response(JSON.stringify({
      success: whatsappResponse.success,
      provider: 'meta',
      messageId: whatsappResponse.messageId,
      logId: messageLog?.id,
      error: whatsappResponse.error,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Build message from template
function buildMessageFromTemplate(templateName: string, data: Record<string, string>): string {
  const templates: Record<string, string> = {
    signature_link: `Hola {{clientName}}, tu contrato está listo para firma digital.\n\n📝 Por favor, accede al siguiente enlace para firmar tu documentación:\n{{signatureUrl}}\n\n⏰ Este enlace expira el {{expirationDate}}.\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\nSaludos,\n{{companyName}}`,

    questionnaire: `Hola {{clientName}}, necesitamos que completes un breve cuestionario para continuar con tu proceso.\n\n📋 Accede aquí: {{questionnaireUrl}}\n\nEste paso es necesario para procesar tu solicitud.\n\nSaludos,\n{{companyName}}`,

    reminder: `Hola {{clientName}}, te recordamos que tienes documentos pendientes de firma.\n\n📝 Enlace de firma: {{signatureUrl}}\n\n⚠️ Este enlace expira el {{expirationDate}}.\n\nNo pierdas tu lugar, firma ahora.\n\nSaludos,\n{{companyName}}`,

    approval: `🎉 ¡Felicitaciones {{clientName}}!\n\nTu solicitud ha sido aprobada exitosamente.\n\n📄 Número de contrato: {{contractNumber}}\n💰 Plan: {{planName}}\n\nPronto recibirás más información sobre tu cobertura.\n\nGracias por confiar en nosotros.\n{{companyName}}`,

    rejection: `Hola {{clientName}},\n\nLamentamos informarte que tu solicitud no pudo ser aprobada en esta ocasión.\n\n{{rejectionReason}}\n\nSi deseas más información, por favor contáctanos.\n\nSaludos,\n{{companyName}}`,

    general: `Hola {{clientName}},\n\n{{message}}\n\nSaludos,\n{{companyName}}`,
  }

  let message = templates[templateName] || templates.general

  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
  })

  return message
}

// Send message via Meta Business API (Facebook Graph API)
async function sendViaMetaAPI(
  apiKey: string,
  phoneId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
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
          text: { body: message }
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('WhatsApp Meta API error:', result)
      return {
        success: false,
        error: result.error?.message || 'Failed to send WhatsApp message'
      }
    }

    return {
      success: true,
      messageId: result.messages?.[0]?.id
    }
  } catch (error: any) {
    console.error('Error calling Meta WhatsApp API:', error)
    return {
      success: false,
      error: error?.message || 'Network error sending WhatsApp message'
    }
  }
}

// Send message via Twilio WhatsApp API
async function sendViaTwilio(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const formattedTo = to.replace(/[\s\-()]/g, '')
    const formattedFrom = fromNumber.replace(/[\s\-()]/g, '')

    const body = new URLSearchParams({
      To: `whatsapp:${formattedTo}`,
      From: `whatsapp:${formattedFrom}`,
      Body: message,
    })

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('Twilio API error:', result)
      return {
        success: false,
        error: result.message || 'Failed to send via Twilio'
      }
    }

    return {
      success: true,
      messageId: result.sid,
    }
  } catch (error: any) {
    console.error('Error calling Twilio API:', error)
    return {
      success: false,
      error: error?.message || 'Network error sending via Twilio'
    }
  }
}

// Send message via WAHA (WhatsApp HTTP API) self-hosted gateway
async function sendViaWAHA(
  gatewayUrl: string,
  apiToken: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const formattedPhone = to.replace(/[\s+\-()]/g, '')
    const chatId = formattedPhone.includes('@') ? formattedPhone : `${formattedPhone}@c.us`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiToken) {
      headers['X-Api-Key'] = apiToken
    }
    console.log('WAHA request:', { baseUrl: gatewayUrl, hasToken: !!apiToken, tokenLength: apiToken?.length, chatId })

    const baseUrl = gatewayUrl.replace(/\/+$/, '')

    const response = await fetch(
      `${baseUrl}/api/sendText`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chatId,
          text: message,
          session: 'default',
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('WAHA API error:', result)
      return {
        success: false,
        error: result.message || result.error || 'Failed to send via WAHA'
      }
    }

    return {
      success: true,
      messageId: result.id || result.key?.id || undefined,
    }
  } catch (error: any) {
    console.error('Error calling WAHA API:', error)
    return {
      success: false,
      error: error?.message || 'Network error sending via WAHA'
    }
  }
}
