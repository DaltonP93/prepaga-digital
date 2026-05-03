import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { SaleAddendum, AddendumBeneficiary } from '@/types/addendums';
import { AddendumBeneficiaryInput } from '@/schemas/addendumBeneficiary';

export type { AddendumBeneficiaryInput };

const addendumSelect = `
  *,
  beneficiaries:sale_addendum_beneficiaries(*),
  signature_links:signature_links!signature_links_sale_addendum_id_fkey(*)
`;

const invalidateAddendumQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  saleId?: string | null,
) => {
  if (saleId) {
    queryClient.invalidateQueries({ queryKey: ['sale-addendums', saleId] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
    queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
    queryClient.invalidateQueries({ queryKey: ['signature-links', saleId] });
  }
  queryClient.invalidateQueries({ queryKey: ['sales'] });
  queryClient.invalidateQueries({ queryKey: ['sales-list'] });
};

export const useSaleAddendums = (saleId: string) => {
  return useQuery<SaleAddendum[], Error>({
    queryKey: ['sale-addendums', saleId],
    queryFn: async () => {
      // @ts-expect-error Table sale_addendums not yet in auto-generated Database types
      const { data, error } = await supabase.from('sale_addendums').select(addendumSelect).eq('parent_sale_id', saleId).order('created_at', { ascending: false });

      if (error) throw error;
      return (data as SaleAddendum[]) || [];
    },
    enabled: !!saleId,
  });
};

export const useCreateSaleAddendum = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  return useMutation<SaleAddendum, Error, { saleId: string; companyId: string }>({
    mutationFn: async ({ saleId, companyId }) => {
      // @ts-expect-error Table sale_addendums not yet in auto-generated Database types
      const { data, error } = await supabase.from('sale_addendums').insert({ parent_sale_id: saleId, company_id: companyId, requested_by: profile?.id || null, type: 'adherent_addition', status: 'borrador' }).select(addendumSelect).single();

      if (error) throw error;
      return data as SaleAddendum;
    },
    onSuccess: (data) => {
      invalidateAddendumQueries(queryClient, data.parent_sale_id);
      toast({ title: 'Anexo creado', description: 'Ya puede cargar los adherentes del anexo.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el anexo.',
        variant: 'destructive',
      });
    },
  });
};

export const useAddAddendumBeneficiary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<AddendumBeneficiary, Error, { addendumId: string; values: AddendumBeneficiaryInput }>({
    mutationFn: async ({ addendumId, values }) => {
      // @ts-expect-error Table sale_addendum_beneficiaries not yet in auto-generated Database types
      const { data, error } = await supabase.from('sale_addendum_beneficiaries').insert({ addendum_id: addendumId, ...values, amount: values.amount || 0, signature_required: values.signature_required ?? true, has_preexisting_conditions: values.has_preexisting_conditions ?? false }).select('*').single();

      if (error) throw error;
      return data as AddendumBeneficiary;
    },
    onSuccess: async (data) => {
      // @ts-expect-error Table sale_addendums not yet in auto-generated Database types
      const { data: addendum } = await supabase.from('sale_addendums').select('parent_sale_id').eq('id', data.addendum_id).single();
      const typedAddendum = addendum as { parent_sale_id: string } | null;
      invalidateAddendumQueries(queryClient, typedAddendum?.parent_sale_id);
      toast({ title: 'Adherente agregado', description: 'El adherente quedó cargado en el anexo.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el adherente.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteAddendumBeneficiary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<string, Error, { id: string; saleId: string }>({
    mutationFn: async ({ id }) => {
      // @ts-expect-error Table sale_addendum_beneficiaries not yet in auto-generated Database types
      const { error } = await supabase.from('sale_addendum_beneficiaries').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      invalidateAddendumQueries(queryClient, variables.saleId);
      toast({ title: 'Adherente quitado', description: 'Se quitó del anexo.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo quitar el adherente.',
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitSaleAddendumForAudit = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<string, Error, { addendumId: string; saleId: string }>({
    mutationFn: async ({ addendumId, saleId }) => {
      // @ts-expect-error RPC function not yet in auto-generated Database types
      const { data, error } = await supabase.rpc('submit_sale_addendum_for_audit', { p_addendum_id: addendumId });
      if (error) throw error;
      return (data as { parent_sale_id: string } | null)?.parent_sale_id || saleId;
    },
    onSuccess: (saleId) => {
      invalidateAddendumQueries(queryClient, saleId);
      toast({ title: 'Enviado a auditoría', description: 'El anexo quedó pendiente de revisión.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar a auditoría.',
        variant: 'destructive',
      });
    },
  });
};

export const useApproveSaleAddendum = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { addendumId: string; saleId: string; note?: string }>({
    mutationFn: async ({ addendumId, note }) => {
      // @ts-expect-error RPC function not yet in auto-generated Database types
      const { data, error } = await supabase.rpc('approve_sale_addendum', { p_addendum_id: addendumId, p_note: note || null });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const parentSaleId = (data as { parent_sale_id?: string } | null)?.parent_sale_id;
      invalidateAddendumQueries(queryClient, parentSaleId);
      toast({ title: 'Anexo aprobado', description: 'Se generaron los documentos y enlaces de firma.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo aprobar el anexo.',
        variant: 'destructive',
      });
    },
  });
};

export const useRejectSaleAddendum = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { addendumId: string; saleId: string; note: string }>({
    mutationFn: async ({ addendumId, note }) => {
      // @ts-expect-error RPC function not yet in auto-generated Database types
      const { data, error } = await supabase.rpc('reject_sale_addendum', { p_addendum_id: addendumId, p_note: note });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const parentSaleId = (data as { parent_sale_id?: string } | null)?.parent_sale_id;
      invalidateAddendumQueries(queryClient, parentSaleId);
      toast({ title: 'Anexo rechazado', description: 'El anexo quedó disponible para corrección.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo rechazar el anexo.',
        variant: 'destructive',
      });
    },
  });
};
