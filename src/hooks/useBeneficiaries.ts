
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type Beneficiary = Database['public']['Tables']['beneficiaries']['Row'];
type BeneficiaryInsert = Database['public']['Tables']['beneficiaries']['Insert'];
type BeneficiaryUpdate = Database['public']['Tables']['beneficiaries']['Update'];

export const useBeneficiaries = (saleId: string) => {
  return useQuery({
    queryKey: ['beneficiaries', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });
};

export const useCreateBeneficiary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beneficiary: BeneficiaryInsert) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert(beneficiary)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', data.sale_id] });
      toast({
        title: "Beneficiario creado",
        description: "El beneficiario ha sido agregado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el beneficiario.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateBeneficiary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BeneficiaryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', data.sale_id] });
      toast({
        title: "Beneficiario actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el beneficiario.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteBeneficiary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: beneficiary } = await supabase
        .from('beneficiaries')
        .select('sale_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return beneficiary?.sale_id;
    },
    onSuccess: (saleId) => {
      if (saleId) {
        queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      }
      toast({
        title: "Beneficiario eliminado",
        description: "El beneficiario ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el beneficiario.",
        variant: "destructive",
      });
    },
  });
};
