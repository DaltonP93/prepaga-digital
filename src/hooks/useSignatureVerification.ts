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

const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

const sha256Fallback = (message: string): string => {
  const words: number[] = [];
  const messageLength = message.length;
  const bitLength = messageLength * 8;
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const initialHash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  for (let i = 0; i < messageLength; i++) {
    words[i >> 2] |= message.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[messageLength >> 2] |= 0x80 << (24 - (messageLength % 4) * 8);
  words[((messageLength + 8) >> 6 << 4) + 15] = bitLength;

  const w = new Array<number>(64);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t] | 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (((w[t - 16] + s0) | 0) + ((w[t - 7] + s1) | 0)) | 0;
    }

    let [a, b, c, d, e, f, g, h] = initialHash;
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + S1) | 0) + ch) | 0) + k[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    initialHash[0] = (initialHash[0] + a) | 0;
    initialHash[1] = (initialHash[1] + b) | 0;
    initialHash[2] = (initialHash[2] + c) | 0;
    initialHash[3] = (initialHash[3] + d) | 0;
    initialHash[4] = (initialHash[4] + e) | 0;
    initialHash[5] = (initialHash[5] + f) | 0;
    initialHash[6] = (initialHash[6] + g) | 0;
    initialHash[7] = (initialHash[7] + h) | 0;
  }

  return initialHash
    .map((value) => (value >>> 0).toString(16).padStart(8, '0'))
    .join('');
};

// Generate SHA-256 hash for document content (client-side)
export async function generateDocumentHash(content: string): Promise<string> {
  const hasWebCrypto = typeof globalThis.crypto !== 'undefined' && !!globalThis.crypto.subtle;
  const hasTextEncoder = typeof globalThis.TextEncoder !== 'undefined';

  if (hasWebCrypto && hasTextEncoder) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  console.warn('Web Crypto no disponible. Usando fallback SHA-256 puro en cliente.');
  return sha256Fallback(content);
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
