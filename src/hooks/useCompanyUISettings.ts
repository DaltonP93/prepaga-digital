import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';
import { Database } from '@/integrations/supabase/types';

type CompanyUISettingsRow = Database['public']['Tables']['company_ui_settings']['Row'];

export const useCompanyUISettings = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-ui-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('company_ui_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company UI settings:', error);
        return null;
      }

      return data;
    },
    enabled: !!profile?.company_id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<CompanyUISettingsRow>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('company_ui_settings')
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
      queryClient.invalidateQueries({ queryKey: ['company-ui-settings'] });
      toast.success('Configuración de UI actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating UI settings:', error);
      toast.error('Error al actualizar la configuración de UI');
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
};
