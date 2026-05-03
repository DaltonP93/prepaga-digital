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
  otp_whatsapp_provider: string;
  otp_whatsapp_gateway_url: string;
  otp_use_signature_whatsapp: boolean;
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
  otp_whatsapp_provider: 'qr_session',
  otp_whatsapp_gateway_url: '',
  otp_use_signature_whatsapp: true,
};

export const useOtpPolicy = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: policy, isLoading } = useQuery({
    queryKey: ['otp-policy', profile?.company_id],
    queryFn: async (): Promise<OtpPolicyConfig> => {
      if (!profile?.company_id) return DEFAULT_POLICY;

      const { data, error } = await supabase
        .from('company_otp_policy' as unknown as keyof Database['public']['Tables'])
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching OTP policy:', error);
        return DEFAULT_POLICY;
      }

      if (!data) return DEFAULT_POLICY;

      const row = data as Record<string, unknown>;
      return {
        id: row.id as string | undefined,
        company_id: row.company_id as string | undefined,
        require_otp_for_signature: (row.require_otp_for_signature as boolean | undefined) ?? true,
        otp_length: (row.otp_length as number | undefined) ?? 6,
        otp_expiration_seconds: (row.otp_expiration_seconds as number | undefined) ?? 300,
        max_attempts: (row.max_attempts as number | undefined) ?? 3,
        default_channel: (row.default_channel as string | undefined) ?? 'email',
        allowed_channels: (row.allowed_channels as string[] | undefined) ?? ['email'],
        whatsapp_otp_enabled: (row.whatsapp_otp_enabled as boolean | undefined) ?? false,
        smtp_host: (row.smtp_host as string | undefined) ?? '',
        smtp_port: (row.smtp_port as number | undefined) ?? 587,
        smtp_user: (row.smtp_user as string | undefined) ?? '',
        smtp_password_encrypted: (row.smtp_password_encrypted as string | undefined) ?? '',
        smtp_from_address: (row.smtp_from_address as string | undefined) ?? '',
        smtp_from_name: (row.smtp_from_name as string | undefined) ?? '',
        smtp_tls: (row.smtp_tls as boolean | undefined) ?? true,
        otp_whatsapp_provider: (row.otp_whatsapp_provider as string | undefined) ?? 'qr_session',
        otp_whatsapp_gateway_url: (row.otp_whatsapp_gateway_url as string | undefined) ?? '',
        otp_use_signature_whatsapp: (row.otp_use_signature_whatsapp as boolean | undefined) ?? true,
      };
    },
    enabled: !!profile?.company_id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<OtpPolicyConfig>) => {
      if (!profile?.company_id) throw new Error('No company ID');

      const { id, company_id, ...cleanUpdates } = updates;

      const dbData = {
        company_id: profile.company_id,
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      };

      // Check if policy already exists
      const { data: existing } = await supabase
        .from('company_otp_policy' as unknown as keyof Database['public']['Tables'])
        .select('id')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('company_otp_policy' as unknown as keyof Database['public']['Tables'])
          .update(dbData as Record<string, unknown>)
          .eq('company_id', profile.company_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('company_otp_policy' as unknown as keyof Database['public']['Tables'])
          .insert(dbData as Record<string, unknown>)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otp-policy'] });
      toast.success('Política OTP actualizada correctamente');
    },
    onError: (error: unknown) => {
      console.error('Error updating OTP policy:', error);
      toast.error('Error al actualizar política OTP');
    },
  });

  return {
    policy: policy || DEFAULT_POLICY,
    isLoading,
    updatePolicy: updateMutation.mutate,
    updatePolicyAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
