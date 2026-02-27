import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationState {
  step: 'idle' | 'sending' | 'awaiting_code' | 'verifying' | 'verified' | 'error' | string;
  verificationId: string | null;
  destinationMasked: string | null;
  expiresAt: string | null;
  attemptsRemaining: number;
  error: string | null;
  channelUsed: string | null;
  attemptedChannel: string | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  providerUsed: string | null;
  sent: boolean;
}

interface OtpPolicy {
  require_otp: boolean;
  allowed_channels: string[];
  default_channel: string;
  whatsapp_enabled: boolean;
}

export const useSignatureVerification = () => {
  const { toast } = useToast();
  const [state, setState] = useState<VerificationState>({
    step: 'idle',
    verificationId: null,
    destinationMasked: null,
    expiresAt: null,
    attemptsRemaining: 3,
    error: null,
    channelUsed: null,
    attemptedChannel: null,
    fallbackUsed: false,
    fallbackReason: null,
    providerUsed: null,
    sent: false,
  });
  const [otpPolicy, setOtpPolicy] = useState<OtpPolicy | null>(null);

  const fetchPolicy = async (saleId: string, token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('signature-otp', {
        body: { action: 'get_policy', sale_id: saleId },
        headers: { 'x-signature-token': token },
      });
      if (!error && data) {
        setOtpPolicy(data);
      }
    } catch (err) {
      console.error('Error fetching OTP policy:', err);
    }
  };

  const sendOTP = async (
    signatureLinkId: string,
    saleId: string,
    recipientEmail: string,
    token: string,
    channel?: string,
    recipientPhone?: string,
  ) => {
    setState(prev => ({ ...prev, step: 'sending', error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('signature-otp', {
        body: {
          action: 'send',
          signature_link_id: signatureLinkId,
          sale_id: saleId,
          recipient_email: recipientEmail,
          recipient_phone: recipientPhone,
          channel: channel || otpPolicy?.default_channel || 'email',
        },
        headers: { 'x-signature-token': token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const wasSent = data.sent !== false;
      const fallbackUsed = !!data.fallback_used;
      const channelUsed = data.channel_used || channel || 'email';
      const attemptedChannel = data.attempted_channel || channel || 'email';

      if (!wasSent) {
        // OTP was NOT sent - show error, don't proceed to awaiting_code
        setState(prev => ({
          ...prev,
          step: 'error',
          error: data.fallback_reason || 'No se pudo enviar el código de verificación. Verifique la configuración de comunicaciones.',
          attemptedChannel,
          channelUsed,
          fallbackUsed,
          fallbackReason: data.fallback_reason || null,
          providerUsed: data.provider_used || null,
          sent: false,
        }));
        toast({
          title: 'Error al enviar código',
          description: data.fallback_reason || 'No se pudo enviar el código. Contacte al administrador.',
          variant: 'destructive',
        });
        return;
      }

      setState(prev => ({
        ...prev,
        step: 'awaiting_code',
        verificationId: data.verification_id,
        destinationMasked: data.destination_masked,
        expiresAt: data.expires_at,
        channelUsed,
        attemptedChannel,
        fallbackUsed,
        fallbackReason: data.fallback_reason || null,
        providerUsed: data.provider_used || null,
        sent: true,
      }));

      const channelLabel = channelUsed === 'whatsapp' ? 'WhatsApp' : 'Email';
      let description = `Se envió un código de verificación a ${data.destination_masked} vía ${channelLabel}`;
      if (fallbackUsed) {
        description += ` (fallback: ${data.fallback_reason})`;
      }

      toast({
        title: 'Código enviado',
        description,
      });
    } catch (err: any) {
      setState(prev => ({ ...prev, step: 'error', error: err.message }));
      toast({
        title: 'Error',
        description: err.message || 'No se pudo enviar el código',
        variant: 'destructive',
      });
    }
  };

  const verifyOTP = async (otpCode: string, signatureLinkId: string, token: string): Promise<boolean> => {
    setState(prev => ({ ...prev, step: 'verifying', error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('signature-otp', {
        body: {
          action: 'verify',
          otp_code: otpCode,
          signature_link_id: signatureLinkId,
        },
        headers: { 'x-signature-token': token },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.expired) {
          setState(prev => ({ ...prev, step: 'error', error: 'El código ha expirado. Solicite uno nuevo.' }));
        } else if (data.attempts_remaining !== undefined) {
          setState(prev => ({
            ...prev,
            step: 'awaiting_code',
            attemptsRemaining: data.attempts_remaining,
            error: `Código incorrecto. ${data.attempts_remaining} intento(s) restante(s).`,
          }));
        } else {
          setState(prev => ({ ...prev, step: 'error', error: data.error }));
        }
        return false;
      }

      setState(prev => ({
        ...prev,
        step: 'verified',
        verificationId: data.verification_id,
        error: null,
      }));

      toast({
        title: 'Identidad verificada',
        description: 'Su identidad ha sido verificada exitosamente.',
      });
      return true;
    } catch (err: any) {
      setState(prev => ({ ...prev, step: 'error', error: err.message }));
      return false;
    }
  };

  const reset = () => {
    setState({
      step: 'idle',
      verificationId: null,
      destinationMasked: null,
      expiresAt: null,
      attemptsRemaining: 3,
      error: null,
      channelUsed: null,
      attemptedChannel: null,
      fallbackUsed: false,
      fallbackReason: null,
      providerUsed: null,
      sent: false,
    });
  };

  return {
    ...state,
    otpPolicy,
    fetchPolicy,
    sendOTP,
    verifyOTP,
    reset,
    isVerified: state.step === 'verified',
  };
};

// Generate SHA-256 hash for document content (client-side)
export async function generateDocumentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Build evidence bundle for a signature event
export async function buildEvidenceBundle(params: {
  documentHash: string;
  identityVerificationId: string | null;
  consentRecordId: string;
  signatureMethod: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}): Promise<{ bundle: any; hash: string }> {
  const bundle = {
    schema_version: '1.0',
    timestamp: params.timestamp,
    document_hash: params.documentHash,
    identity_verification: {
      verified: !!params.identityVerificationId,
      verification_id: params.identityVerificationId,
    },
    consent_record: {
      record_id: params.consentRecordId,
    },
    signature: {
      method: params.signatureMethod,
      ip: params.ip,
      user_agent: params.userAgent,
    },
    legal_framework: {
      law: 'Ley N° 4017/2010 - República del Paraguay',
      standards: ['ISO 14533', 'ISO 27001', 'UNCITRAL'],
      level: 'Firma Electrónica Avanzada (referencial eIDAS)',
    },
  };

  const bundleStr = JSON.stringify(bundle, null, 2);
  const hash = await generateDocumentHash(bundleStr);

  return { bundle, hash };
}
