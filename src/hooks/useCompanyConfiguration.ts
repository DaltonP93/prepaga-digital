
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanyConfiguration {
  id: string;
  company_id: string;
  login_background_url?: string;
  login_logo_url?: string;
  login_title?: string;
  login_subtitle?: string;
  primary_color?: string;
  secondary_color?: string;
  whatsapp_api_enabled?: boolean;
  whatsapp_api_token?: string;
  whatsapp_phone_number?: string;
  sms_api_enabled?: boolean;
  sms_api_provider?: string;
  sms_api_key?: string;
  sms_api_secret?: string;
  email_api_enabled?: boolean;
  email_api_provider?: string;
  email_api_key?: string;
  email_from_address?: string;
  tracking_enabled?: boolean;
  notifications_enabled?: boolean;
}

export const useCompanyConfiguration = () => {
  const queryClient = useQueryClient();

  const { data: configuration, isLoading } = useQuery({
    queryKey: ['company-configuration'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('company_configurations')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as CompanyConfiguration | null;
    },
  });

  const updateConfiguration = useMutation({
    mutationFn: async (updates: Partial<CompanyConfiguration>) => {
      if (configuration?.id) {
        const { data, error } = await (supabase as any)
          .from('company_configurations')
          .update(updates)
          .eq('id', configuration.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        const { data, error } = await (supabase as any)
          .from('company_configurations')
          .insert({
            company_id: profile?.company_id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-configuration'] });
      toast.success('Configuración actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating configuration:', error);
      toast.error('Error al actualizar la configuración');
    },
  });

  return {
    configuration,
    isLoading,
    updateConfiguration: updateConfiguration.mutate,
    isUpdating: updateConfiguration.isPending,
  };
};
