
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

interface CompanyConfiguration {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  login_background_url?: string | null;
  login_logo_url?: string | null;
  login_title?: string;
  login_subtitle?: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
}

export const useCompanyConfiguration = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: configuration, isLoading } = useQuery({
    queryKey: ['company-configuration', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching company configuration:', error);
        return null;
      }

      return data as CompanyConfiguration;
    },
    enabled: !!profile?.company_id,
  });

  const updateConfiguration = useMutation({
    mutationFn: async (updates: Partial<CompanyConfiguration>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', profile.company_id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
