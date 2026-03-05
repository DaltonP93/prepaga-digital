import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

export interface AnalyticsConfigType {
  kpis: {
    conversionRate: boolean;
    avgTicket: boolean;
    customerLifetime: boolean;
    churnRate: boolean;
    monthlyRecurring: boolean;
  };
  tabs: {
    trends: boolean;
    conversion: boolean;
    performance: boolean;
    products: boolean;
  };
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfigType = {
  kpis: {
    conversionRate: true,
    avgTicket: true,
    customerLifetime: true,
    churnRate: true,
    monthlyRecurring: true,
  },
  tabs: {
    trends: true,
    conversion: true,
    performance: true,
    products: true,
  },
};

export const KPI_LABELS: Record<string, string> = {
  conversionRate: 'Tasa de Conversión',
  avgTicket: 'Ticket Promedio',
  customerLifetime: 'Valor Vitalicio',
  churnRate: 'Tasa de Churn',
  monthlyRecurring: 'MRR',
};

export const TAB_LABELS: Record<string, string> = {
  trends: 'Tendencias',
  conversion: 'Conversión',
  performance: 'Performance',
  products: 'Productos',
};

export const useAnalyticsConfig = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: config, isLoading } = useQuery({
    queryKey: ['analytics-config', profile?.company_id],
    queryFn: async (): Promise<AnalyticsConfigType> => {
      if (!profile?.company_id) return { ...DEFAULT_ANALYTICS_CONFIG };

      const { data, error } = await supabase
        .from('company_ui_settings')
        .select('analytics_config')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching analytics config:', error);
        return { ...DEFAULT_ANALYTICS_CONFIG };
      }

      const stored = (data as any)?.analytics_config;
      if (!stored || typeof stored !== 'object') {
        return { ...DEFAULT_ANALYTICS_CONFIG };
      }

      return {
        kpis: { ...DEFAULT_ANALYTICS_CONFIG.kpis, ...(stored.kpis || {}) },
        tabs: { ...DEFAULT_ANALYTICS_CONFIG.tabs, ...(stored.tabs || {}) },
      };
    },
    enabled: !!profile?.company_id,
  });

  const analyticsConfig: AnalyticsConfigType = config || { ...DEFAULT_ANALYTICS_CONFIG };

  const updateConfig = useMutation({
    mutationFn: async (newConfig: AnalyticsConfigType) => {
      if (!profile?.company_id) throw new Error('No company_id');

      const { error } = await supabase
        .from('company_ui_settings')
        .upsert({
          company_id: profile.company_id,
          analytics_config: newConfig,
          updated_at: new Date().toISOString(),
        } as any)
        .select();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-config'] });
      toast.success('Configuración de analytics guardada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al guardar configuración');
    },
  });

  return {
    analyticsConfig,
    isLoading,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
};
