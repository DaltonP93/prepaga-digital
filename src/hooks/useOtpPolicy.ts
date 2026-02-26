import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

export interface OtpPolicyConfig {
  id?: string;
  company_id?: string;
  require_otp_for_signature: boolean;
  otp_length: number;
  otp_expiration_seconds: number;
  max_attempts: number;
  default_channel: string;
  allowed_channels: string[];
  whatsapp_otp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password_encrypted: string;
  smtp_from_address: string;
  smtp_from_name: string;
  smtp_tls: boolean;
}

const DEFAULT_POLICY: OtpPolicyConfig = {
  require_otp_for_signature: true,
  otp_length: 6,
  otp_expiration_seconds: 300,
  max_attempts: 3,
  default_channel: 'email',
  allowed_channels: ['email'],
  whatsapp_otp_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password_encrypted: '',
  smtp_from_address: '',
  smtp_from_name: '',
  smtp_tls: true,
};

export const useOtpPolicy = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: policy, isLoading } = useQuery({
    queryKey: ['otp-policy', profile?.company_id],
    queryFn: async (): Promise<OtpPolicyConfig> => {
      if (!profile?.company_id) return DEFAULT_POLICY;

      const { data, error } = await supabase
        .from('company_otp_policy' as any)
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching OTP policy:', error);
        return DEFAULT_POLICY;
      }

      if (!data) return DEFAULT_POLICY;

      return {
        id: (data as any).id,
        company_id: (data as any).company_id,
        require_otp_for_signature: (data as any).require_otp_for_signature ?? true,
        otp_length: (data as any).otp_length ?? 6,
        otp_expiration_seconds: (data as any).otp_expiration_seconds ?? 300,
        max_attempts: (data as any).max_attempts ?? 3,
        default_channel: (data as any).default_channel ?? 'email',
        allowed_channels: (data as any).allowed_channels ?? ['email'],
        whatsapp_otp_enabled: (data as any).whatsapp_otp_enabled ?? false,
        smtp_host: (data as any).smtp_host ?? '',
        smtp_port: (data as any).smtp_port ?? 587,
        smtp_user: (data as any).smtp_user ?? '',
        smtp_password_encrypted: (data as any).smtp_password_encrypted ?? '',
        smtp_from_address: (data as any).smtp_from_address ?? '',
        smtp_from_name: (data as any).smtp_from_name ?? '',
        smtp_tls: (data as any).smtp_tls ?? true,
      };
    },
    enabled: !!profile?.company_id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<OtpPolicyConfig>) => {
      if (!profile?.company_id) throw new Error('No company ID');

      const dbData = {
        company_id: profile.company_id,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('company_otp_policy' as any)
        .upsert(dbData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otp-policy'] });
      toast.success('Política OTP actualizada correctamente');
    },
    onError: (error: any) => {
      console.error('Error updating OTP policy:', error);
      toast.error('Error al actualizar política OTP');
    },
  });

  return {
    policy: policy || DEFAULT_POLICY,
    isLoading,
    updatePolicy: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
