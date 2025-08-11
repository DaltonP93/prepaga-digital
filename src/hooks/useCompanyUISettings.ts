
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';

interface CompanyUISettings {
  id: string;
  company_id: string;
  dark_mode: boolean;
  shadows: boolean;
  font_family: string;
  border_radius: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  favicon: string;
  custom_css: string;
  login_background_url?: string;
  login_logo_url?: string;
  login_title: string;
  login_subtitle: string;
  created_at: string;
  updated_at: string;
}

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

      return data as CompanyUISettings | null;
    },
    enabled: !!profile?.company_id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<CompanyUISettings>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('company_ui_settings')
        .upsert({
          company_id: profile.company_id,
          ...updates
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
