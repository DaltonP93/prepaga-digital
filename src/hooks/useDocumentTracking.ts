
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DocumentTrackingRecord {
  id: string;
  sale_id: string;
  document_type: string;
  access_time: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  device_os?: string;
  browser?: string;
  action: string;
  progress_percentage: number;
  time_spent_seconds: number;
  country?: string;
  city?: string;
  metadata: any;
  created_at: string;
}

export const useDocumentTracking = (saleId?: string) => {
  const queryClient = useQueryClient();

  const { data: trackingRecords, isLoading } = useQuery({
    queryKey: ['document-tracking', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_tracking')
        .select('*')
        .eq('sale_id', saleId!)
        .order('access_time', { ascending: false });

      if (error) throw error;
      return data as DocumentTrackingRecord[];
    },
    enabled: !!saleId,
  });

  const createTrackingRecord = useMutation({
    mutationFn: async (record: Omit<DocumentTrackingRecord, 'id' | 'access_time' | 'created_at'>) => {
      // Detectar información del dispositivo
      const userAgent = navigator.userAgent;
      const deviceInfo = getDeviceInfo(userAgent);
      
      const { data, error } = await supabase
        .from('document_tracking')
        .insert({
          ...record,
          user_agent: userAgent,
          device_type: deviceInfo.type,
          device_os: deviceInfo.os,
          browser: deviceInfo.browser,
          ip_address: await getClientIP(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tracking', saleId] });
    },
  });

  const getStats = () => {
    if (!trackingRecords) return null;

    const totalViews = trackingRecords.filter(r => r.action === 'viewed').length;
    const totalCompleted = trackingRecords.filter(r => r.action === 'completed').length;
    const totalSigned = trackingRecords.filter(r => r.action === 'signed').length;
    const uniqueDevices = new Set(trackingRecords.map(r => r.device_type)).size;
    const averageProgress = trackingRecords.length > 0 
      ? trackingRecords.reduce((sum, r) => sum + r.progress_percentage, 0) / trackingRecords.length 
      : 0;

    return {
      totalViews,
      totalCompleted,
      totalSigned,
      uniqueDevices,
      averageProgress,
    };
  };

  return {
    trackingRecords,
    isLoading,
    createTrackingRecord: createTrackingRecord.mutate,
    isCreating: createTrackingRecord.isPending,
    stats: getStats(),
  };
};

// Funciones utilitarias
function getDeviceInfo(userAgent: string) {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  let type = 'desktop';
  if (isTablet) type = 'tablet';
  else if (isMobile) type = 'mobile';

  let os = 'Unknown';
  if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Mac/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

  let browser = 'Unknown';
  if (/Chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Safari/i.test(userAgent)) browser = 'Safari';
  else if (/Edge/i.test(userAgent)) browser = 'Edge';

  return { type, os, browser };
}

async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}
