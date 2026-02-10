import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { validateSaleTransition } from '@/lib/workflowValidator';

type SaleStatus = Database['public']['Enums']['sale_status'];

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
            plans:plan_id(name, price)
          )
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

      // Validate workflow transition before updating status
      const { data: sale } = await supabase.from('sales').select('*, template_responses(id)').eq('id', saleId).single();
      if (sale?.company_id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', auditorId).single();
        const check = await validateSaleTransition(sale.company_id, sale, 'en_auditoria', (profile?.role as any) || 'auditor');
        if (!check.allowed) throw new Error(check.reasons.join(', '));
      }

      // Update sale status to en_auditoria
      await supabase
        .from('sales')
        .update({ status: 'en_auditoria' as SaleStatus })
        .eq('id', saleId);

      // Create process trace
      await supabase
        .from('process_traces')
        .insert({
          sale_id: saleId,
          action: 'audit_started',
          user_id: auditorId,
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
      // First get the audit process to find sale_id
      const { data: auditProcess, error: fetchError } = await supabase
        .from('audit_processes')
        .select('sale_id')
        .eq('id', processId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('audit_processes')
        .update({ 
          status,
          notes: notes || '',
          completed_at: status === 'approved' || status === 'rejected' ? new Date().toISOString() : null
        })
        .eq('id', processId)
        .select()
        .single();

      if (error) throw error;

      // Update sale status based on audit result
      let saleStatus: SaleStatus = 'enviado';

      if (status === 'approved') {
        saleStatus = 'completado';
      } else if (status === 'rejected') {
        saleStatus = 'cancelado';
      }

      // Validate workflow transition
      const { data: saleData } = await supabase.from('sales').select('*, template_responses(id)').eq('id', auditProcess.sale_id).single();
      if (saleData?.company_id) {
        const { data: currentUser } = await supabase.auth.getUser();
        const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', currentUser?.user?.id || '').single();
        const check = await validateSaleTransition(saleData.company_id, saleData, saleStatus, (userProfile?.role as any) || 'auditor');
        if (!check.allowed) throw new Error(check.reasons.join(', '));
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
