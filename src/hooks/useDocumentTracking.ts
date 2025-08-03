
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DocumentTrackingRecord {
  id: string;
  document_id: string;
  action: string;
  access_time: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  session_id?: string;
  metadata: any;
}

interface TokenValidationRecord {
  sale_id: string;
  token: string;
  is_valid: boolean;
  is_revoked: boolean;
  is_expired: boolean;
  revoked_at?: string;
  revoked_by?: string;
  expires_at: string;
  validation_timestamp: string;
}

export const useDocumentTracking = (saleId?: string) => {
  const queryClient = useQueryClient();

  const { data: trackingRecords, isLoading } = useQuery({
    queryKey: ['document-tracking', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      
      const { data, error } = await supabase
        .from('document_access_logs')
        .select('*')
        .eq('document_id', saleId) // Assuming document_id can reference sales
        .order('access_time', { ascending: false });

      if (error) throw error;
      return data as DocumentTrackingRecord[];
    },
    enabled: !!saleId,
  });

  const validateToken = useMutation({
    mutationFn: async (token: string) => {
      const { data: sale, error } = await supabase
        .from('sales')
        .select(`
          id,
          signature_token,
          signature_expires_at,
          status
        `)
        .eq('signature_token', token)
        .single();

      if (error || !sale) {
        throw new Error('Token inválido');
      }

      const now = new Date();
      const expiresAt = new Date(sale.signature_expires_at || '');
      const isExpired = expiresAt < now;

      const validation: TokenValidationRecord = {
        sale_id: sale.id,
        token,
        is_valid: !isExpired,
        is_revoked: false,
        is_expired: isExpired,
        expires_at: sale.signature_expires_at || '',
        validation_timestamp: now.toISOString()
      };

      return validation;
    },
  });

  const createTrackingRecord = useMutation({
    mutationFn: async (record: Omit<DocumentTrackingRecord, 'id' | 'access_time'>) => {
      // Detectar información del dispositivo
      const userAgent = navigator.userAgent;
      const deviceInfo = getDeviceInfo(userAgent);
      
      const { data, error } = await supabase
        .from('document_access_logs')
        .insert({
          document_id: record.document_id,
          action: record.action,
          user_agent: userAgent,
          device_type: deviceInfo.type,
          session_id: record.session_id,
          metadata: {
            ...record.metadata,
            device_os: deviceInfo.os,
            browser: deviceInfo.browser
          },
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

    return {
      totalViews,
      totalCompleted,
      totalSigned,
      uniqueDevices,
    };
  };

  return {
    trackingRecords,
    isLoading,
    createTrackingRecord: createTrackingRecord.mutate,
    isCreating: createTrackingRecord.isPending,
    validateToken: validateToken.mutate,
    isValidating: validateToken.isPending,
    stats: getStats(),
  };
};

// Funciones utilitarias mejoradas
function getDeviceInfo(userAgent: string) {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  let type = 'desktop';
  if (isTablet) type = 'tablet';
  else if (isMobile) type = 'mobile';

  let os = 'Unknown';
  if (/Windows NT 10/i.test(userAgent)) os = 'Windows 10';
  else if (/Windows NT/i.test(userAgent)) os = 'Windows';
  else if (/Mac OS X/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';

  let browser = 'Unknown';
  if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Edge|Edg/i.test(userAgent)) browser = 'Edge';
  else if (/Opera|OPR/i.test(userAgent)) browser = 'Opera';

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
