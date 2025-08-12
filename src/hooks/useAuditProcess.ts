
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditProcess {
  id: string;
  sale_id: string;
  auditor_id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ProcessTrace {
  id: string;
  sale_id: string;
  action: string;
  performed_by?: string;
  client_action: boolean;
  details?: any;
  created_at: string;
}

interface InformationRequest {
  id: string;
  audit_process_id: string;
  requested_by: string;
  description: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export const useAuditProcesses = () => {
  return useQuery({
    queryKey: ['audit-processes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_processes')
        .select(`
          *,
          sales:sale_id(
            *,
            clients:client_id(first_name, last_name, email),
            plans:plan_id(name, price),
            salesperson:salesperson_id(first_name, last_name, email)
          ),
          auditor:auditor_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useCreateAuditProcess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, auditorId, notes }: { saleId: string; auditorId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('audit_processes')
        .insert({
          sale_id: saleId,
          auditor_id: auditorId,
          status: 'pending',
          notes: notes || ''
        })
        .select()
        .single();

      if (error) throw error;

      // Update sale status
      await supabase
        .from('sales')
        .update({ status: 'enviado' })
        .eq('id', saleId);

      // Create process trace
      await supabase
        .from('process_traces')
        .insert({
          sale_id: saleId,
          action: 'audit_started',
          performed_by: auditorId,
          client_action: false,
          details: { audit_process_id: data.id }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Proceso de auditoría iniciado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al iniciar proceso de auditoría');
    },
  });
};

export const useUpdateAuditProcess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ processId, status, notes }: { processId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('audit_processes')
        .update({ 
          status,
          notes: notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', processId)
        .select()
        .single();

      if (error) throw error;

      // Get the sale_id to update sale status
      const auditProcess = data as AuditProcess;
      let saleStatus = 'enviado';
      
      if (status === 'approved') {
        saleStatus = 'completado';
      } else if (status === 'rejected') {
        saleStatus = 'cancelado';
      }

      await supabase
        .from('sales')
        .update({ status: saleStatus })
        .eq('id', auditProcess.sale_id);

      // Create process trace
      await supabase
        .from('process_traces')
        .insert({
          sale_id: auditProcess.sale_id,
          action: `audit_${status}`,
          performed_by: null, // Will be set by auth context
          client_action: false,
          details: { notes }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Proceso de auditoría actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar proceso de auditoría');
    },
  });
};
