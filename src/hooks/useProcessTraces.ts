
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProcessTrace {
  id: string;
  sale_id: string;
  action: string;
  performed_by?: string;
  client_action: boolean;
  details?: any;
  created_at: string;
  user?: {
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
          user:profiles!performed_by(
            first_name,
            last_name,
            role
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });
};

export const useCreateTrace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, action, details, clientAction = false }: { 
      saleId: string; 
      action: string; 
      details?: any;
      clientAction?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('process_traces')
        .insert({
          sale_id: saleId,
          action,
          performed_by: user.user?.id || null,
          client_action: clientAction,
          details: details || {}
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['process-traces', variables.saleId] });
    },
  });
};
