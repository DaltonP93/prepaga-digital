
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProcessTrace {
  id: string;
  sale_id: string;
  action: string;
  performed_by?: string;
  client_action: boolean;
  details: any;
  created_at: string;
  performed_by_user?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export const useProcessTraces = (saleId: string) => {
  return useQuery({
    queryKey: ['process-traces', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_traces')
        .select(`
          *,
          performed_by_user:profiles!performed_by(
            first_name,
            last_name,
            role
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProcessTrace[];
    },
    enabled: !!saleId,
  });
};

export const useCreateProcessTrace = () => {
  return useMutation({
    mutationFn: async ({
      saleId,
      action,
      performedBy,
      clientAction = false,
      details = {}
    }: {
      saleId: string;
      action: string;
      performedBy?: string;
      clientAction?: boolean;
      details?: any;
    }) => {
      const { data, error } = await supabase
        .from('process_traces')
        .insert({
          sale_id: saleId,
          action,
          performed_by: performedBy,
          client_action: clientAction,
          details
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
};

// Funciones utilitarias para crear trazas específicas
export const useTraceActions = () => {
  const createTrace = useCreateProcessTrace();

  const traceDocumentOpened = (saleId: string, documentType: string) => {
    return createTrace.mutate({
      saleId,
      action: 'document_opened',
      clientAction: true,
      details: { document_type: documentType }
    });
  };

  const traceFormSubmitted = (saleId: string, formType: string, responseCount: number) => {
    return createTrace.mutate({
      saleId,
      action: 'form_submitted',
      clientAction: true,
      details: { form_type: formType, response_count: responseCount }
    });
  };

  const traceContractSigned = (saleId: string, signatureData: any) => {
    return createTrace.mutate({
      saleId,
      action: 'contract_signed',
      clientAction: true,
      details: { signature_timestamp: new Date().toISOString(), ...signatureData }
    });
  };

  const traceAuditDecision = (saleId: string, decision: string, notes?: string) => {
    return createTrace.mutate({
      saleId,
      action: `audit_${decision}`,
      clientAction: false,
      details: { decision, notes }
    });
  };

  return {
    traceDocumentOpened,
    traceFormSubmitted,
    traceContractSigned,
    traceAuditDecision
  };
};
