
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Simple audit process using existing tables
export const useAuditProcesses = () => {
  return useQuery({
    queryKey: ['audit-processes'],
    queryFn: async () => {
      // For now, return sales that need audit based on status
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, email),
          plans:plan_id(name, price),
          salesperson:salesperson_id(first_name, last_name, email)
        `)
        .in('status', ['pendiente', 'enviado'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useUpdateSaleStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, status, notes }: { saleId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('sales')
        .update({ 
          status,
          notes: notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la venta ha sido actualizado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado de la venta.",
        variant: "destructive",
      });
    },
  });
};
