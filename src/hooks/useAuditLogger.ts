import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  entity_type: string;
  action: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
}

export const useAuditLogger = () => {
  const logAudit = useMutation({
    mutationFn: async (params: AuditLogParams) => {
      // Get current user and company
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user?.id || '')
        .single();

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: params.entity_type,
          action: params.action,
          entity_id: params.entity_id,
          old_values: params.old_values,
          new_values: params.new_values,
          user_agent: navigator.userAgent,
          user_id: userData.user?.id,
          company_id: profile?.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Funciones de conveniencia para acciones comunes
  const logLogin = () => {
    logAudit.mutate({
      entity_type: 'auth_sessions',
      action: 'LOGIN',
      metadata: { timestamp: new Date().toISOString() }
    });
  };

  const logSaleCreated = (saleId: string, saleData: any) => {
    logAudit.mutate({
      entity_type: 'sales',
      action: 'CREATE',
      entity_id: saleId,
      new_values: saleData
    });
  };

  const logSaleUpdated = (saleId: string, oldData: any, newData: any) => {
    logAudit.mutate({
      entity_type: 'sales',
      action: 'UPDATE',
      entity_id: saleId,
      old_values: oldData,
      new_values: newData
    });
  };

  const logDocumentSigned = (saleId: string, documentData: any) => {
    logAudit.mutate({
      entity_type: 'signatures',
      action: 'SIGN',
      entity_id: saleId,
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
