import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function generateOTP(length = 6): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % Math.pow(10, length)).padStart(length, '0');
}

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return '***@***';
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

// Send OTP via SMTP Relay (HTTP-based, since Edge Functions can't do native SMTP)
async function sendViaSMTPRelay(
  email: string,
  otp: string,
  smtpRelayUrl: string,
  fromAddress: string,
  fromName: string,
): Promise<boolean> {
  try {
    const res = await fetch(smtpRelayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Código de verificación para firma electrónica',
        html: buildOTPEmailHTML(otp),
        from_address: fromAddress,
        from_name: fromName,
      }),
    });
    if (!res.ok) {
      console.error('SMTP relay error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('SMTP relay send error:', err);
    return false;
  }
}

// Send OTP via WhatsApp using the configured provider
async function sendViaWhatsApp(
  phone: string,
  otp: string,
  supabase: any,
  companyId: string,
): Promise<{ sent: boolean; provider_used: string; reason?: string }> {
  try {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('whatsapp_provider, whatsapp_api_key, whatsapp_phone_id, whatsapp_gateway_url, whatsapp_linked_phone, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('company_id', companyId)
      .single();

    const provider = settings?.whatsapp_provider || 'wame_fallback';

    if (provider === 'wame_fallback') {
      return { sent: false, provider_used: 'wame_fallback', reason: 'wa.me (manual) no puede enviar OTP automático' };
    }

    const message = `🔐 Tu código de verificación para firma electrónica es: *${otp}*\n\nEste código es válido por 5 minutos.\nNo compartas este código con nadie.`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (provider === 'meta') {
      if (!settings?.whatsapp_api_key || !settings?.whatsapp_phone_id) {
        return { sent: false, provider_used: 'meta', reason: 'Meta API no configurada (falta token o phone_id)' };
      }
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${settings.whatsapp_phone_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.whatsapp_api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: { body: message },
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error('Meta WhatsApp API error:', errText);
        return { sent: false, provider_used: 'meta', reason: `Meta API error: ${errText.slice(0, 100)}` };
      }
      return { sent: true, provider_used: 'meta' };
    }

    if (provider === 'twilio') {
      if (!settings?.twilio_account_sid || !settings?.twilio_auth_token || !settings?.twilio_whatsapp_number) {
        return { sent: false, provider_used: 'twilio', reason: 'Twilio no configurado (falta SID, token o número)' };
      }
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`;
      const auth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`);
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${settings.twilio_whatsapp_number}`);
      formData.append('To', `whatsapp:+${cleanPhone}`);
      formData.append('Body', message);

      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Twilio error:', errText);
        return { sent: false, provider_used: 'twilio', reason: `Twilio error: ${errText.slice(0, 100)}` };
      }
      return { sent: true, provider_used: 'twilio' };
    }

    if (provider === 'qr_session') {
      if (!settings?.whatsapp_gateway_url) {
        return { sent: false, provider_used: 'qr_session', reason: 'Gateway URL no configurada' };
      }
      const gatewayUrl = settings.whatsapp_gateway_url.replace(/\/$/, '');
      const res = await fetch(`${gatewayUrl}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          otp,
          companyId,
          message,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('QR Gateway error:', errText);
        return { sent: false, provider_used: 'qr_session', reason: `Gateway error: ${errText.slice(0, 100)}` };
      }
      return { sent: true, provider_used: 'qr_session' };
    }

    return { sent: false, provider_used: provider, reason: `Proveedor desconocido: ${provider}` };
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return { sent: false, provider_used: 'unknown', reason: err.message };
  }
}

function buildOTPEmailHTML(otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e; text-align: center;">Verificación de Identidad</h2>
      <p style="color: #333; font-size: 16px;">Para continuar con la firma electrónica de sus documentos, ingrese el siguiente código de verificación:</p>
      <div style="background: #f0f4ff; border: 2px solid #3B82F6; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
      </div>
      <p style="color: #666; font-size: 14px;">Este código es válido por <strong>5 minutos</strong>.</p>
      <p style="color: #666; font-size: 14px;">Si no solicitó este código, puede ignorar este mensaje.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        Este mensaje fue enviado como parte del proceso de firma electrónica conforme a la Ley N° 4017/2010 de la República del Paraguay.
      </p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signatureToken = req.headers.get('x-signature-token');
    const body = await req.json();
    const { action, otp_code, signature_link_id, sale_id, recipient_email, recipient_phone, channel: requestedChannel } = body;

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'send') {
      if (!signature_link_id || !sale_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get company ID from sale
      const { data: saleData } = await supabase
        .from('sales')
        .select('company_id')
        .eq('id', sale_id)
        .single();

      const companyId = saleData?.company_id;

      // Get OTP policy for this company
      let otpPolicy: any = {
        otp_length: 6,
        otp_expiration_seconds: 300,
        max_attempts: 3,
        default_channel: 'email',
        allowed_channels: ['email'],
        whatsapp_otp_enabled: false,
        smtp_host: null,
        smtp_port: 587,
        smtp_user: null,
        smtp_password_encrypted: null,
        smtp_from_address: null,
        smtp_from_name: null,
        smtp_tls: true,
        smtp_relay_url: null,
      };

      if (companyId) {
        const { data: policy } = await supabase
          .from('company_otp_policy')
          .select('*')
          .eq('company_id', companyId)
          .single();

        if (policy) {
          otpPolicy = { ...otpPolicy, ...policy };
        }
      }

      // Determine channel
      const channel = requestedChannel || otpPolicy.default_channel || 'email';
      const allowedChannels = Array.isArray(otpPolicy.allowed_channels)
        ? otpPolicy.allowed_channels
        : ['email'];

      if (!allowedChannels.includes(channel)) {
        return new Response(JSON.stringify({ error: `Canal ${channel} no permitido` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate OTP
      const otp = generateOTP(otpPolicy.otp_length);
      const otpHash = await hashOTP(otp);
      const expiresAt = new Date(Date.now() + otpPolicy.otp_expiration_seconds * 1000);

      let destinationMasked = '';
      let sendSuccess = false;
      let attemptedChannel = channel;
      let channelUsed = channel;
      let fallbackUsed = false;
      let fallbackReason = '';
      let providerUsed = '';

      // Send via chosen channel
      if (channel === 'whatsapp' && companyId) {
        const phone = recipient_phone || '';
        if (!phone) {
          // No phone → fallback to email
          fallbackUsed = true;
          fallbackReason = 'No se proporcionó número de teléfono';
          channelUsed = 'email';
        } else {
          const waResult = await sendViaWhatsApp(phone, otp, supabase, companyId);
          providerUsed = waResult.provider_used;
          if (waResult.sent) {
            sendSuccess = true;
            channelUsed = 'whatsapp';
            destinationMasked = maskPhone(phone);
          } else {
            // Fallback to email via SMTP
            fallbackUsed = true;
            fallbackReason = waResult.reason || 'WhatsApp no disponible';
            channelUsed = 'email';
          }
        }

        // If we fell back to email
        if (!sendSuccess && channelUsed === 'email' && recipient_email) {
          const emailResult = await sendEmailOTP(recipient_email, otp, otpPolicy, companyId, supabase);
          sendSuccess = emailResult.sent;
          providerUsed = emailResult.provider_used;
          destinationMasked = maskEmail(recipient_email);
          if (!emailResult.sent) {
            fallbackReason += `. Email fallback también falló: ${emailResult.reason}`;
          }
        }
      } else if ((channel === 'email' || channel === 'smtp') && recipient_email) {
        channelUsed = 'email';
        const emailResult = await sendEmailOTP(recipient_email, otp, otpPolicy, companyId, supabase);
        sendSuccess = emailResult.sent;
        providerUsed = emailResult.provider_used;
        destinationMasked = maskEmail(recipient_email);
        if (!emailResult.sent) {
          fallbackReason = emailResult.reason || 'Email no pudo ser enviado';
        }
      } else if (recipient_email) {
        // Default email
        channelUsed = 'email';
        const emailResult = await sendEmailOTP(recipient_email, otp, otpPolicy, companyId, supabase);
        sendSuccess = emailResult.sent;
        providerUsed = emailResult.provider_used;
        destinationMasked = maskEmail(recipient_email);
      }

      // Store verification record
      const { data: verification, error: insertError } = await supabase
        .from('signature_identity_verification')
        .insert({
          signature_link_id,
          sale_id,
          auth_method: channelUsed === 'whatsapp' ? 'OTP_WHATSAPP' : 'OTP_EMAIL',
          channel: channelUsed,
          destination_masked: destinationMasked,
          otp_code_hash: otpHash,
          expires_at: expiresAt.toISOString(),
          max_attempts: otpPolicy.max_attempts,
          ip_address: ip,
          user_agent: userAgent,
          result: sendSuccess ? 'pending' : 'send_failed',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting verification:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to create verification' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        verification_id: verification.id,
        destination_masked: destinationMasked,
        expires_at: expiresAt.toISOString(),
        attempted_channel: attemptedChannel,
        channel_used: channelUsed,
        sent: sendSuccess,
        fallback_used: fallbackUsed,
        fallback_reason: fallbackReason || undefined,
        provider_used: providerUsed,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'verify') {
      if (!otp_code) {
        return new Response(JSON.stringify({ error: 'OTP code required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: verifications, error: fetchError } = await supabase
        .from('signature_identity_verification')
        .select('*')
        .eq('signature_link_id', signature_link_id)
        .eq('result', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError || !verifications?.length) {
        return new Response(JSON.stringify({ error: 'No pending verification found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verification = verifications[0];

      if (new Date(verification.expires_at) < new Date()) {
        await supabase
          .from('signature_identity_verification')
          .update({ result: 'expired' })
          .eq('id', verification.id);

        return new Response(JSON.stringify({ error: 'OTP expired', expired: true }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const maxAttempts = verification.max_attempts || 3;
      if (verification.attempts >= maxAttempts) {
        await supabase
          .from('signature_identity_verification')
          .update({ result: 'max_attempts_exceeded' })
          .eq('id', verification.id);

        return new Response(JSON.stringify({ error: 'Maximum attempts exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const inputHash = await hashOTP(otp_code);
      const isValid = inputHash === verification.otp_code_hash;

      await supabase
        .from('signature_identity_verification')
        .update({
          attempts: verification.attempts + 1,
          result: isValid ? 'verified' : 'pending',
          verified_at: isValid ? new Date().toISOString() : null,
          ip_address: ip,
          user_agent: userAgent,
        })
        .eq('id', verification.id);

      if (!isValid) {
        const remaining = maxAttempts - verification.attempts - 1;
        return new Response(JSON.stringify({
          error: 'Invalid OTP code',
          attempts_remaining: remaining,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        verification_id: verification.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'get_policy') {
      if (!sale_id) {
        return new Response(JSON.stringify({ error: 'sale_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: saleData } = await supabase
        .from('sales')
        .select('company_id')
        .eq('id', sale_id)
        .single();

      if (!saleData?.company_id) {
        return new Response(JSON.stringify({ 
          require_otp: true,
          allowed_channels: ['email'],
          default_channel: 'email',
          whatsapp_enabled: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: policy } = await supabase
        .from('company_otp_policy')
        .select('require_otp_for_signature, allowed_channels, default_channel, whatsapp_otp_enabled')
        .eq('company_id', saleData.company_id)
        .single();

      return new Response(JSON.stringify({
        require_otp: policy?.require_otp_for_signature ?? true,
        allowed_channels: policy?.allowed_channels ?? ['email'],
        default_channel: policy?.default_channel ?? 'email',
        whatsapp_enabled: policy?.whatsapp_otp_enabled ?? false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'test_smtp') {
      const { smtp_host, smtp_port, smtp_user, smtp_from_address, smtp_from_name, smtp_tls, smtp_relay_url, test_email } = body;
      
      if (smtp_relay_url && test_email) {
        // Actually test the relay by sending a test email
        try {
          const sent = await sendViaSMTPRelay(
            test_email,
            '000000',
            smtp_relay_url,
            smtp_from_address || 'test@test.com',
            smtp_from_name || 'Test'
          );
          return new Response(JSON.stringify({ 
            success: sent, 
            message: sent ? `Email de prueba enviado a ${test_email} vía SMTP relay` : 'SMTP relay no pudo enviar el email'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!smtp_host && !smtp_relay_url) {
        return new Response(JSON.stringify({ success: false, error: 'Falta host SMTP o URL de relay' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Configuración SMTP validada. Host: ${smtp_host || 'relay'}:${smtp_port || 587}, TLS: ${smtp_tls !== false ? 'Sí' : 'No'}. La conexión real se realizará al enviar OTP.` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'test_whatsapp') {
      // Test WhatsApp sending
      const { test_phone, company_id: testCompanyId } = body;
      if (!test_phone || !testCompanyId) {
        return new Response(JSON.stringify({ success: false, error: 'Falta número de prueba o company_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await sendViaWhatsApp(test_phone, '123456', supabase, testCompanyId);
      return new Response(JSON.stringify({
        success: result.sent,
        provider_used: result.provider_used,
        error: result.reason,
        message: result.sent ? `WhatsApp de prueba enviado vía ${result.provider_used}` : `Error: ${result.reason}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Signature OTP error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Unified email sending: SMTP relay only (no Resend)
async function sendEmailOTP(
  email: string,
  otp: string,
  otpPolicy: any,
  companyId: string | null,
  supabase: any,
): Promise<{ sent: boolean; provider_used: string; reason?: string }> {
  // Check for SMTP relay URL in OTP policy
  const smtpRelayUrl = otpPolicy.smtp_relay_url;
  const fromAddress = otpPolicy.smtp_from_address || 'noreply@prepagadigital.com';
  const fromName = otpPolicy.smtp_from_name || 'Prepaga Digital';

  if (smtpRelayUrl) {
    const sent = await sendViaSMTPRelay(email, otp, smtpRelayUrl, fromAddress, fromName);
    return { sent, provider_used: 'smtp_relay', reason: sent ? undefined : 'SMTP relay falló al enviar' };
  }

  // No SMTP relay configured - report clearly
  return { 
    sent: false, 
    provider_used: 'none', 
    reason: 'SMTP relay no configurado. Configure smtp_relay_url en la Política OTP para habilitar email.' 
  };
}
