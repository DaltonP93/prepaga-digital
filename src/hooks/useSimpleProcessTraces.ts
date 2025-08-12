
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Simple version using sale_notes as a basic tracing mechanism
export const useProcessTraces = (saleId: string) => {
  return useQuery({
    queryKey: ['process-traces', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_notes')
        .select(`
          *,
          user:profiles!user_id(
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
  return {
    mutate: async ({ saleId, action, details }: { saleId: string; action: string; details: any }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('sale_notes')
        .insert({
          sale_id: saleId,
          user_id: user.user.id,
          note: `${action}: ${JSON.stringify(details)}`
        });

      if (error) throw error;
    }
  };
};
