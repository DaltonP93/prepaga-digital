
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Plan = Database['public']['Tables']['plans']['Row'];
type PlanInsert = Database['public']['Tables']['plans']['Insert'];
type PlanUpdate = Database['public']['Tables']['plans']['Update'];

interface PlanWithCompany extends Plan {
  companies?: {
    id: string;
    name: string;
  } | null;
}

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async (): Promise<PlanWithCompany[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          companies:company_id(id, name)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }
      return data || [];
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: PlanInsert) => {
      const { data, error } = await supabase
        .from('plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating plan:', error);
      toast.error('Error al crear plan: ' + error.message);
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PlanUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating plan:', error);
      toast.error('Error al actualizar plan: ' + error.message);
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plans')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan desactivado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deactivating plan:', error);
      toast.error('Error al desactivar plan: ' + error.message);
    },
  });
};
