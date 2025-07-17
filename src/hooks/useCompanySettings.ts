
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';

interface CompanySettings {
  id?: string;
  company_id: string;
  resend_api_key?: string;
  whatsapp_api_key?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  sms_api_key?: string;
  settings?: any;
}

export const useCompanySettings = () => {
  const { toast } = useToast();
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<CompanySettings>) => {
      if (!profile?.company_id) throw new Error('No company ID found');

      const settingsData = {
        company_id: profile.company_id,
        ...newSettings,
      };

      const { data, error } = await supabase
        .from('company_settings')
        .upsert(settingsData, {
          onConflict: 'company_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración.",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
};
