import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

export interface WahaHealthLog {
  id: string;
  company_id: string;
  session_status: string;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
  created_at: string;
}

export const useWahaHealthCheck = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: healthLogs, isLoading } = useQuery({
    queryKey: ['waha-health-logs', profile?.company_id],
    queryFn: async (): Promise<WahaHealthLog[]> => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('waha_health_logs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching health logs:', error);
        return [];
      }

      return (data || []) as unknown as WahaHealthLog[];
    },
    enabled: !!profile?.company_id,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const checkNowMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('No company ID');

      const { data, error } = await supabase.functions.invoke('waha-health-check', {
        body: { company_id: profile.company_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waha-health-logs'] });
      toast.success('Verificación completada');
    },
    onError: (error) => {
      console.error('Health check error:', error);
      toast.error('Error al verificar el estado de WAHA');
    },
  });

  const latestStatus = healthLogs?.[0] || null;

  return {
    healthLogs: healthLogs || [],
    latestStatus,
    isLoading,
    checkNow: checkNowMutation.mutate,
    isChecking: checkNowMutation.isPending,
  };
};
