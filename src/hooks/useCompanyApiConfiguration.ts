import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

export type WhatsAppProvider = 'meta' | 'twilio' | 'wame_fallback' | 'qr_session';
export type EmailProvider = 'resend' | 'smtp';

export interface CompanyApiConfig {
  whatsapp_provider: WhatsAppProvider;
  whatsapp_api_enabled: boolean;
  whatsapp_api_token: string;
  whatsapp_phone_number: string;
  whatsapp_gateway_url: string;
  whatsapp_linked_phone: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_whatsapp_number: string;
  sms_api_enabled: boolean;
  sms_api_key: string;
  email_provider: EmailProvider;
  email_api_enabled: boolean;
  email_api_key: string;
  email_from_address: string;
  email_from_name: string;
  signwell_enabled: boolean;
  signwell_api_key: string;
}

const DEFAULT_CONFIGURATION: CompanyApiConfig = {
  whatsapp_provider: 'wame_fallback',
  whatsapp_api_enabled: false,
  whatsapp_api_token: '',
  whatsapp_phone_number: '',
  whatsapp_gateway_url: '',
  whatsapp_linked_phone: '',
  twilio_account_sid: '',
  twilio_auth_token: '',
  twilio_whatsapp_number: '',
  sms_api_enabled: false,
  sms_api_key: '',
  email_provider: 'resend',
  email_api_enabled: false,
  email_api_key: '',
  email_from_address: '',
  email_from_name: '',
  signwell_enabled: false,
  signwell_api_key: '',
};

export const useCompanyApiConfiguration = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: configuration, isLoading } = useQuery({
    queryKey: ['company-api-configuration', profile?.company_id],
    queryFn: async (): Promise<CompanyApiConfig> => {
      if (!profile?.company_id) {
        return getDefaultConfiguration();
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company API configuration:', error);
        return getDefaultConfiguration();
      }

      if (!data) {
        return getDefaultConfiguration();
      }

      return {
        whatsapp_provider: (data as any).whatsapp_provider || 'wame_fallback',
        whatsapp_api_enabled: !!data.whatsapp_api_key,
        whatsapp_api_token: data.whatsapp_api_key || '',
        whatsapp_phone_number: data.whatsapp_phone_id || '',
        whatsapp_gateway_url: (data as any).whatsapp_gateway_url || '',
        whatsapp_linked_phone: (data as any).whatsapp_linked_phone || '',
        twilio_account_sid: (data as any).twilio_account_sid || '',
        twilio_auth_token: (data as any).twilio_auth_token || '',
        twilio_whatsapp_number: (data as any).twilio_whatsapp_number || '',
        sms_api_enabled: !!data.sms_api_key,
        sms_api_key: data.sms_api_key || '',
        email_provider: (data as any).email_provider || 'resend',
        email_api_enabled: !!data.email_api_key,
        email_api_key: data.email_api_key || '',
        email_from_address: data.email_from_address || '',
        email_from_name: data.email_from_name || '',
        signwell_enabled: !!(data as any).signwell_enabled,
        signwell_api_key: (data as any).signwell_api_key || '',
      };
    },
    enabled: !!profile?.company_id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      // Map UI field names to DB column names (only columns that exist in company_settings)
      const dbUpdates: Record<string, any> = {
        company_id: profile.company_id,
        updated_at: new Date().toISOString(),
      };

      if ('whatsapp_api_token' in updates) dbUpdates.whatsapp_api_key = updates.whatsapp_api_token;
      if ('whatsapp_phone_number' in updates) dbUpdates.whatsapp_phone_id = updates.whatsapp_phone_number;
      if ('whatsapp_gateway_url' in updates) dbUpdates.whatsapp_gateway_url = updates.whatsapp_gateway_url;
      if ('whatsapp_linked_phone' in updates) dbUpdates.whatsapp_linked_phone = updates.whatsapp_linked_phone;
      if ('sms_api_key' in updates) dbUpdates.sms_api_key = updates.sms_api_key;
      if ('email_provider' in updates) dbUpdates.email_provider = updates.email_provider;
      if ('email_api_key' in updates) dbUpdates.email_api_key = updates.email_api_key;
      if ('email_from_address' in updates) dbUpdates.email_from_address = updates.email_from_address;
      if ('email_from_name' in updates) dbUpdates.email_from_name = updates.email_from_name;
      if ('signwell_enabled' in updates) dbUpdates.signwell_enabled = updates.signwell_enabled;
      if ('signwell_api_key' in updates) dbUpdates.signwell_api_key = updates.signwell_api_key;

      const { data, error } = await supabase
        .from('company_settings')
        .upsert(dbUpdates as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-api-configuration'] });
      toast.success('Configuración API actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating API configuration:', error);
      toast.error('Error al actualizar la configuración API');
    },
  });

  return {
    configuration: configuration || DEFAULT_CONFIGURATION,
    isLoading,
    updateConfiguration: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};

const getDefaultConfiguration = (): CompanyApiConfig => DEFAULT_CONFIGURATION;
