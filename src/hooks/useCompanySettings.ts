import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type CompanySettings = Tables<"company_settings">;
type CompanySettingsInsert = TablesInsert<"company_settings">;
type CompanySettingsUpdate = TablesUpdate<"company_settings">;

export const useCompanySettings = (companyId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener configuración de la empresa
  const {
    data: settings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Crear o actualizar configuración
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<CompanySettingsInsert & CompanySettingsUpdate>) => {
      if (settings) {
        // Actualizar existente
        const { data, error } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('company_id', companyId!)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Crear nuevo
        const { data, error } = await supabase
          .from('company_settings')
          .insert({ company_id: companyId!, ...updates })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración de la empresa se ha guardado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
};

// Hook para obtener configuración de branding de empresa
export const useCompanyBranding = (companyId?: string) => {
  return useQuery({
    queryKey: ['company-branding', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('login_background_url, login_logo_url, login_title, login_subtitle, primary_color, secondary_color, accent_color, logo_url')
        .eq('id', companyId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};