
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';

interface CompanyApiConfiguration {
  // WhatsApp Configuration
  whatsapp_api_enabled: boolean;
  whatsapp_api_token: string;
  whatsapp_phone_number: string;
  
  // SMS Configuration
  sms_api_enabled: boolean;
  sms_api_provider: 'twilio' | 'nexmo' | 'messagebird';
  sms_api_key: string;
  sms_api_secret: string;
  
  // Email Configuration
  email_api_enabled: boolean;
  email_api_provider: 'resend' | 'sendgrid' | 'mailgun';
  email_api_key: string;
  email_from_address: string;
  
  // General Settings
  tracking_enabled: boolean;
  notifications_enabled: boolean;
}

export const useCompanyApiConfiguration = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  const { data: configuration, isLoading } = useQuery({
    queryKey: ['company-api-configuration', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('settings')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company API configuration:', error);
        return getDefaultConfiguration();
      }

      if (!data?.settings) {
        return getDefaultConfiguration();
      }

      const defaultConfig = getDefaultConfiguration();
      return {
        ...defaultConfig,
        ...(data.settings || {})
      } as CompanyApiConfiguration;
    },
    enabled: !!profile?.company_id,
  });

  const updateConfiguration = useMutation({
    mutationFn: async (updates: Partial<CompanyApiConfiguration>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: profile.company_id,
          settings: updates
        })
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
    configuration,
    isLoading,
    updateConfiguration: updateConfiguration.mutate,
    isUpdating: updateConfiguration.isPending,
  };
};

const getDefaultConfiguration = (): CompanyApiConfiguration => ({
  whatsapp_api_enabled: false,
  whatsapp_api_token: '',
  whatsapp_phone_number: '',
  sms_api_enabled: false,
  sms_api_provider: 'twilio',
  sms_api_key: '',
  sms_api_secret: '',
  email_api_enabled: false,
  email_api_provider: 'resend',
  email_api_key: '',
  email_from_address: '',
  tracking_enabled: false,
  notifications_enabled: false,
});
