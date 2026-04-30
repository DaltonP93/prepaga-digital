import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

export type SaleAddendumStatus =
  | 'borrador'
  | 'en_auditoria'
  | 'rechazado'
  | 'aprobado'
  | 'enviado_firma'
  | 'completado'
  | 'cancelado';

export interface AddendumBeneficiaryInput {
  first_name: string;
  last_name: string;
  dni?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  relationship?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  barrio?: string | null;
  city?: string | null;
  province?: string | null;
  amount?: number | null;
  signature_required?: boolean;
  has_preexisting_conditions?: boolean;
  preexisting_conditions_detail?: string | null;
}

const addendumSelect = `
  *,
  beneficiaries:sale_addendum_beneficiaries(*),
  signature_links:signature_links!signature_links_sale_addendum_id_fkey(*)
`;

const invalidateAddendumQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  saleId?: string,
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
  return useQuery({
    queryKey: ['sale-addendums', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_addendums' as any)
        .select(addendumSelect)
        .eq('parent_sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });
};

export const useCreateSaleAddendum = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  return useMutation({
    mutationFn: async ({ saleId, companyId }: { saleId: string; companyId: string }) => {
      const { data, error } = await supabase
        .from('sale_addendums' as any)
        .insert({
          parent_sale_id: saleId,
          company_id: companyId,
          requested_by: profile?.id || null,
          type: 'adherent_addition',
          status: 'borrador',
        })
        .select(addendumSelect)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      invalidateAddendumQueries(queryClient, data.parent_sale_id);
      toast({ title: 'Anexo creado', description: 'Ya puede cargar los adherentes del anexo.' });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ addendumId, values }: { addendumId: string; values: AddendumBeneficiaryInput }) => {
      const { data, error } = await supabase
        .from('sale_addendum_beneficiaries' as any)
        .insert({
          addendum_id: addendumId,
          ...values,
          amount: values.amount || 0,
          signature_required: values.signature_required ?? true,
          has_preexisting_conditions: values.has_preexisting_conditions ?? false,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any) => {
      const { data: addendum } = await supabase
        .from('sale_addendums' as any)
        .select('parent_sale_id')
        .eq('id', data.addendum_id)
        .single();
      invalidateAddendumQueries(queryClient, addendum?.parent_sale_id);
      toast({ title: 'Adherente agregado', description: 'El adherente quedó cargado en el anexo.' });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from('sale_addendum_beneficiaries' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return saleId;
    },
    onSuccess: (saleId) => {
      invalidateAddendumQueries(queryClient, saleId);
      toast({ title: 'Adherente quitado', description: 'Se quitó del anexo.' });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ addendumId, saleId }: { addendumId: string; saleId: string }) => {
      const { data, error } = await supabase.rpc('submit_sale_addendum_for_audit' as any, {
        p_addendum_id: addendumId,
      });
      if (error) throw error;
      return (data as any)?.parent_sale_id || saleId;
    },
    onSuccess: (saleId) => {
      invalidateAddendumQueries(queryClient, saleId);
      toast({ title: 'Enviado a auditoría', description: 'El anexo quedó pendiente de revisión.' });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ addendumId, note }: { addendumId: string; saleId: string; note?: string }) => {
      const { data, error } = await supabase.rpc('approve_sale_addendum' as any, {
        p_addendum_id: addendumId,
        p_note: note || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      invalidateAddendumQueries(queryClient, data?.parent_sale_id);
      toast({ title: 'Anexo aprobado', description: 'Se generaron los documentos y enlaces de firma.' });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ addendumId, note }: { addendumId: string; saleId: string; note: string }) => {
      const { data, error } = await supabase.rpc('reject_sale_addendum' as any, {
        p_addendum_id: addendumId,
        p_note: note,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      invalidateAddendumQueries(queryClient, data?.parent_sale_id);
      toast({ title: 'Anexo rechazado', description: 'El anexo quedó disponible para corrección.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo rechazar el anexo.',
        variant: 'destructive',
      });
    },
  });
};
