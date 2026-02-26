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
  });

  const sendOTP = async (signatureLinkId: string, saleId: string, recipientEmail: string, token: string) => {
    setState(prev => ({ ...prev, step: 'sending', error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('signature-otp', {
        body: {
          action: 'send',
          signature_link_id: signatureLinkId,
          sale_id: saleId,
          recipient_email: recipientEmail,
        },
        headers: { 'x-signature-token': token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setState(prev => ({
        ...prev,
        step: 'awaiting_code',
        verificationId: data.verification_id,
        destinationMasked: data.destination_masked,
        expiresAt: data.expires_at,
      }));

      toast({
        title: 'Código enviado',
        description: `Se envió un código de verificación a ${data.destination_masked}`,
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
    });
  };

  return {
    ...state,
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
