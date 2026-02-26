import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-token',
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

// Send OTP via Resend (email)
async function sendViaResend(email: string, otp: string, resendApiKey: string, fromName: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <noreply@resend.dev>`,
        to: [email],
        subject: 'Código de verificación para firma electrónica',
        html: buildOTPEmailHTML(otp),
      }),
    });
    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend send error:', err);
    return false;
  }
}

// Send OTP via custom SMTP (Office 365, iRedMail, etc.)
async function sendViaSMTP(
  email: string,
  otp: string,
  smtpConfig: { host: string; port: number; user: string; password: string; fromAddress: string; fromName: string; tls: boolean }
): Promise<boolean> {
  // Deno doesn't have native SMTP support in edge functions,
  // so we use the Resend fallback or external SMTP relay.
  // For custom SMTP, we'll use a fetch-based SMTP relay pattern.
  // In production, this would call an SMTP gateway service.
  console.warn('Custom SMTP not directly available in Edge Functions. Using Resend fallback.');
  return false;
}

// Send OTP via WhatsApp (using company's configured WhatsApp provider)
async function sendViaWhatsApp(
  phone: string,
  otp: string,
  supabase: any,
  companyId: string
): Promise<boolean> {
  try {
    // Get company WhatsApp settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('whatsapp_api_key, whatsapp_phone_id')
      .eq('company_id', companyId)
      .single();

    if (!settings?.whatsapp_api_key || !settings?.whatsapp_phone_id) {
      console.warn('WhatsApp API not configured for company:', companyId);
      return false;
    }

    // Send via Meta WhatsApp Business API
    const message = `🔐 Tu código de verificación para firma electrónica es: *${otp}*\n\nEste código es válido por 5 minutos.\nNo compartas este código con nadie.`;

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
          to: phone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!res.ok) {
      console.error('WhatsApp API error:', await res.text());
      return false;
    }

    // Log the message
    await supabase.from('whatsapp_messages').insert({
      company_id: companyId,
      phone_number: phone,
      message_type: 'otp_verification',
      message_body: `Código OTP enviado`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return false;
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
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
      let otpPolicy = {
        otp_length: 6,
        otp_expiration_seconds: 300,
        max_attempts: 3,
        default_channel: 'email',
        allowed_channels: ['email'],
        whatsapp_otp_enabled: false,
        smtp_host: null as string | null,
        smtp_port: 587,
        smtp_user: null as string | null,
        smtp_password_encrypted: null as string | null,
        smtp_from_address: null as string | null,
        smtp_from_name: null as string | null,
        smtp_tls: true,
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

      // Send via chosen channel
      if (channel === 'whatsapp' && recipient_phone && companyId) {
        sendSuccess = await sendViaWhatsApp(recipient_phone, otp, supabase, companyId);
        destinationMasked = maskPhone(recipient_phone);
        if (!sendSuccess && recipient_email) {
          // Fallback to email
          console.log('WhatsApp failed, falling back to email');
          if (resendApiKey) {
            sendSuccess = await sendViaResend(recipient_email, otp, resendApiKey, otpPolicy.smtp_from_name || 'Prepaga Digital');
          }
          destinationMasked = maskEmail(recipient_email);
        }
      } else if (channel === 'smtp' && recipient_email && otpPolicy.smtp_host) {
        // Try custom SMTP first, fallback to Resend
        sendSuccess = await sendViaSMTP(recipient_email, otp, {
          host: otpPolicy.smtp_host,
          port: otpPolicy.smtp_port || 587,
          user: otpPolicy.smtp_user || '',
          password: otpPolicy.smtp_password_encrypted || '',
          fromAddress: otpPolicy.smtp_from_address || '',
          fromName: otpPolicy.smtp_from_name || 'Prepaga Digital',
          tls: otpPolicy.smtp_tls ?? true,
        });
        if (!sendSuccess && resendApiKey) {
          sendSuccess = await sendViaResend(recipient_email, otp, resendApiKey, otpPolicy.smtp_from_name || 'Prepaga Digital');
        }
        destinationMasked = maskEmail(recipient_email);
      } else if (recipient_email) {
        // Default: email via Resend
        if (resendApiKey) {
          sendSuccess = await sendViaResend(recipient_email, otp, resendApiKey, otpPolicy.smtp_from_name || 'Prepaga Digital');
        } else {
          console.warn('RESEND_API_KEY not configured. OTP:', otp);
          sendSuccess = true; // Dev mode
        }
        destinationMasked = maskEmail(recipient_email);
      }

      // Store verification record
      const { data: verification, error: insertError } = await supabase
        .from('signature_identity_verification')
        .insert({
          signature_link_id,
          sale_id,
          auth_method: channel === 'whatsapp' ? 'OTP_WHATSAPP' : channel === 'smtp' ? 'OTP_SMTP' : 'OTP_EMAIL',
          channel,
          destination_masked: destinationMasked,
          otp_code_hash: otpHash,
          expires_at: expiresAt.toISOString(),
          max_attempts: otpPolicy.max_attempts,
          ip_address: ip,
          user_agent: userAgent,
          result: 'pending',
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
        channel_used: channel,
        sent: sendSuccess,
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

      // Get the latest pending verification for this link
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

      // Check expiration
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

      // Check max attempts
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

      // Verify OTP hash
      const inputHash = await hashOTP(otp_code);
      const isValid = inputHash === verification.otp_code_hash;

      // Update attempt count
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
      // Return OTP policy for the sale's company
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
