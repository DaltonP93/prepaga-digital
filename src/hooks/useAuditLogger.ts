
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  table_name: string;
  action: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
}

export const useAuditLogger = () => {
  const logAudit = useMutation({
    mutationFn: async (params: AuditLogParams) => {
      const { data, error } = await supabase.rpc('log_audit', {
        p_table_name: params.table_name,
        p_action: params.action,
        p_record_id: params.record_id,
        p_old_values: params.old_values,
        p_new_values: params.new_values,
        p_ip_address: null, // Se obtiene en el servidor
        p_user_agent: navigator.userAgent,
        p_session_id: null,
        p_request_path: window.location.pathname,
        p_request_method: 'POST',
      });

      if (error) throw error;
      return data;
    },
  });

  // Funciones de conveniencia para acciones comunes
  const logLogin = () => {
    logAudit.mutate({
      table_name: 'auth_sessions',
      action: 'LOGIN',
      metadata: { timestamp: new Date().toISOString() }
    });
  };

  const logSaleCreated = (saleId: string, saleData: any) => {
    logAudit.mutate({
      table_name: 'sales',
      action: 'CREATE',
      record_id: saleId,
      new_values: saleData
    });
  };

  const logSaleUpdated = (saleId: string, oldData: any, newData: any) => {
    logAudit.mutate({
      table_name: 'sales',
      action: 'UPDATE',
      record_id: saleId,
      old_values: oldData,
      new_values: newData
    });
  };

  const logDocumentSigned = (saleId: string, documentData: any) => {
    logAudit.mutate({
      table_name: 'signatures',
      action: 'SIGN',
      record_id: saleId,
      new_values: documentData
    });
  };

  return {
    logAudit: logAudit.mutate,
    logLogin,
    logSaleCreated,
    logSaleUpdated,
    logDocumentSigned,
    isLogging: logAudit.isPending,
  };
};
