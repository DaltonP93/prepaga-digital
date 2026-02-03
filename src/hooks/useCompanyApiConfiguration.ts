import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';
import { Database } from '@/integrations/supabase/types';

type CompanySettingsRow = Database['public']['Tables']['company_settings']['Row'];

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
        whatsapp_api_enabled: !!data.whatsapp_api_key,
        whatsapp_api_token: data.whatsapp_api_key || '',
        whatsapp_phone_number: data.whatsapp_phone_id || '',
        sms_api_enabled: !!data.sms_api_key,
        sms_api_key: data.sms_api_key || '',
        email_api_enabled: !!data.email_api_key,
        email_api_key: data.email_api_key || '',
        email_from_address: data.email_from_address || '',
        email_from_name: data.email_from_name || '',
      };
    },
    enabled: !!profile?.company_id,
  });

  const updateConfiguration = useMutation({
    mutationFn: async (updates: Partial<CompanySettingsRow>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: profile.company_id,
          ...updates,
          updated_at: new Date().toISOString(),
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

const getDefaultConfiguration = () => ({
  whatsapp_api_enabled: false,
  whatsapp_api_token: '',
  whatsapp_phone_number: '',
  sms_api_enabled: false,
  sms_api_key: '',
  email_api_enabled: false,
  email_api_key: '',
  email_from_address: '',
  email_from_name: '',
});
