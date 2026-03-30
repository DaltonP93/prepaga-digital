
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { filterToSingleCompany, SINGLE_COMPANY_PRIMARY_NAME } from '@/lib/singleCompany';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return filterToSingleCompany(data);
    },
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: CompanyInsert) => {
      throw new Error(`El sistema está bloqueado a una sola empresa: ${SINGLE_COMPANY_PRIMARY_NAME}.`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa creada exitosamente');
    },
    onError: (error: any) => {
      toast.error('Error al crear empresa: ' + error.message);
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CompanyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error('Error al actualizar empresa: ' + error.message);
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      throw new Error(`No se puede desactivar la empresa principal ${SINGLE_COMPANY_PRIMARY_NAME}.`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa desactivada exitosamente');
    },
    onError: (error: any) => {
      toast.error('Error al desactivar empresa: ' + error.message);
    },
  });
};
