
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
  email_api_key?: string;
  settings?: any;
}

interface CompanyBranding {
  id?: string;
  name?: string;
  login_logo_url?: string;
  login_background_url?: string;
  login_title?: string;
  login_subtitle?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export const useCompanySettings = (companyId?: string) => {
  const { toast } = useToast();
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  
  const actualCompanyId = companyId || profile?.company_id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings', actualCompanyId],
    queryFn: async () => {
      if (!actualCompanyId) return null;
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', actualCompanyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!actualCompanyId,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<CompanySettings>) => {
      if (!actualCompanyId) throw new Error('No company ID found');

      const settingsData = {
        company_id: actualCompanyId,
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
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
};

export const useCompanyBranding = (companyId?: string) => {
  const { data: branding, isLoading } = useQuery({
    queryKey: ['company-branding', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as CompanyBranding;
    },
    enabled: !!companyId,
  });

  return {
    data: branding,
    isLoading,
  };
};
