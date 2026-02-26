import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-token',
}

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
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
    const { action, otp_code, signature_link_id, sale_id, recipient_email } = await req.json();

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'send') {
      // Generate and send OTP
      if (!signature_link_id || !sale_id || !recipient_email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const otp = generateOTP();
      const otpHash = await hashOTP(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store verification record
      const { data: verification, error: insertError } = await supabase
        .from('signature_identity_verification')
        .insert({
          signature_link_id,
          sale_id,
          auth_method: 'OTP_EMAIL',
          destination_masked: maskEmail(recipient_email),
          otp_code_hash: otpHash,
          expires_at: expiresAt.toISOString(),
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

      // Send OTP via email using Resend
      if (resendApiKey) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Prepaga Digital <noreply@resend.dev>',
              to: [recipient_email],
              subject: 'Código de verificación para firma electrónica',
              html: `
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
              `,
            }),
          });

          if (!emailRes.ok) {
            console.error('Resend error:', await emailRes.text());
          }
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }
      } else {
        console.warn('RESEND_API_KEY not configured. OTP:', otp);
      }

      return new Response(JSON.stringify({
        success: true,
        verification_id: verification.id,
        destination_masked: maskEmail(recipient_email),
        expires_at: expiresAt.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'verify') {
      // Verify OTP
      const { verification_id } = await req.json().catch(() => ({}));
      
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
      if (verification.attempts >= verification.max_attempts) {
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
        const remaining = verification.max_attempts - verification.attempts - 1;
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
