
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
          token_revoked,
          token_revoked_at,
          token_revoked_by,
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
      const isRevoked = sale.token_revoked === true;

      const validation: TokenValidationRecord = {
        sale_id: sale.id,
        token,
        is_valid: !isExpired && !isRevoked,
        is_revoked: isRevoked,
        is_expired: isExpired,
        revoked_at: sale.token_revoked_at || undefined,
        revoked_by: sale.token_revoked_by || undefined,
        expires_at: sale.signature_expires_at || '',
        validation_timestamp: now.toISOString()
      };

      return validation;
    },
  });

  const createTrackingRecord = useMutation({
    mutationFn: async (record: Omit<DocumentTrackingRecord, 'id' | 'access_time' | 'created_at'>) => {
      // Detectar información del dispositivo
      const userAgent = navigator.userAgent;
      const deviceInfo = getDeviceInfo(userAgent);
      
      const { data, error } = await supabase
        .from('document_access_logs')
        .insert({
          document_id: record.sale_id, // Using sale_id as document reference
          action: record.action,
          user_agent: userAgent,
          device_type: deviceInfo.type,
          session_id: record.metadata?.session_id,
          metadata: {
            ...record.metadata,
            device_os: deviceInfo.os,
            browser: deviceInfo.browser,
            progress_percentage: record.progress_percentage,
            time_spent_seconds: record.time_spent_seconds
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
    const averageProgress = trackingRecords.length > 0 
      ? trackingRecords.reduce((sum, r) => sum + (r.progress_percentage || 0), 0) / trackingRecords.length 
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
