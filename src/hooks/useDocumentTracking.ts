import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type DocumentAccessLog = Tables<"document_access_logs">;
type DocumentAccessLogInsert = TablesInsert<"document_access_logs">;

export const useDocumentTracking = (documentId?: string) => {
  // Obtener logs de acceso del documento
  const {
    data: accessLogs,
    isLoading: isLoadingLogs,
  } = useQuery({
    queryKey: ['document-access-logs', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_access_logs')
        .select('*')
        .eq('document_id', documentId!)
        .order('access_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  // Obtener estadísticas del documento
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['document-stats', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const { data: logs, error } = await supabase
        .from('document_access_logs')
        .select('action, device_type')
        .eq('document_id', documentId);

      if (error) throw error;

      const views = logs.filter(log => log.action === 'viewed').length;
      const completions = logs.filter(log => log.action === 'completed').length;
      const signatures = logs.filter(log => log.action === 'signed').length;
      const deviceTypes = [...new Set(logs.map(log => log.device_type).filter(Boolean))];

      return {
        views,
        completions,
        signatures,
        deviceTypes,
        totalAccess: logs.length,
      };
    },
    enabled: !!documentId,
  });

  // Registrar acceso al documento
  const logAccessMutation = useMutation({
    mutationFn: async (logData: Omit<DocumentAccessLogInsert, 'id' | 'access_time'>) => {
      const { data, error } = await supabase
        .from('document_access_logs')
        .insert({
          ...logData,
          ip_address: await getClientIP(),
          device_type: getDeviceType(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    accessLogs,
    stats,
    isLoadingLogs,
    isLoadingStats,
    logAccess: logAccessMutation.mutate,
    isLoggingAccess: logAccessMutation.isPending,
  };
};

// Funciones utilitarias
async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}

function getDeviceType(): string {
  const userAgent = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}