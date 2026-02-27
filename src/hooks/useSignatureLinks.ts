
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSignatureLinks = (saleId: string) => {
  return useQuery({
    queryKey: ['signature-links', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_links')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });
};

export const useSignatureLinkByToken = (token: string) => {
  return useQuery({
    queryKey: ['signature-link', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_links')
        .select(`
          *,
          sales (
            *,
            clients (*),
            plans (*),
            documents (*),
            beneficiaries (*)
          )
        `)
        .eq('token', token)
        .single();

      if (error) throw error;

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Este enlace ha expirado');
      }

      // Update access count
      await supabase
        .from('signature_links')
        .update({
          access_count: (data.access_count || 0) + 1,
          accessed_at: new Date().toISOString(),
          status: data.status === 'pendiente' ? 'visualizado' : data.status,
        })
        .eq('id', data.id);

      return data;
    },
    enabled: !!token,
    retry: false,
  });
};

export const useCreateSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      recipientType,
      recipientEmail,
      recipientPhone,
      expirationDays = 1,
      beneficiaryId,
    }: {
      saleId: string;
      recipientType: string;
      recipientEmail?: string;
      recipientPhone?: string;
      expirationDays?: number;
      beneficiaryId?: string;
    }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const { data, error } = await supabase
        .from('signature_links')
        .insert({
          sale_id: saleId,
          token,
          recipient_type: recipientType,
          recipient_email: recipientEmail || '',
          recipient_phone: recipientPhone || null,
          recipient_id: beneficiaryId || null,
          expires_at: expiresAt.toISOString(),
          status: 'pendiente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signature-links', data.sale_id] });
      toast({
        title: 'Enlace creado',
        description: 'El enlace de firma ha sido generado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el enlace de firma.',
        variant: 'destructive',
      });
    },
  });
};

export const useCompleteSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      signatureData,
      signedIp,
    }: {
      linkId: string;
      signatureData: string;
      signedIp?: string;
    }) => {
      const { data: link, error: fetchError } = await supabase
        .from('signature_links')
        .select('*')
        .eq('id', linkId)
        .single();

      if (fetchError) throw fetchError;

      // Update signature link
      const updateData: any = {
        status: 'completado',
        completed_at: new Date().toISOString(),
      };
      if (signedIp) {
        updateData.ip_addresses = [signedIp];
      }

      const { error: updateError } = await supabase
        .from('signature_links')
        .update(updateData)
        .eq('id', linkId);

      if (updateError) throw updateError;

      // Log workflow step
      await supabase.from('signature_workflow_steps').insert({
        signature_link_id: linkId,
        step_type: 'signature_completed',
        step_order: 1,
        status: 'completado',
        completed_at: new Date().toISOString(),
        data: { signed_ip: signedIp },
      });

      return link;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signature-links', data.sale_id] });
      toast({
        title: 'Firma completada',
        description: 'La firma ha sido registrada exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo completar la firma.',
        variant: 'destructive',
      });
    },
  });
};

export const useRevokeSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { data: link, error: fetchError } = await supabase
        .from('signature_links')
        .select('sale_id')
        .eq('id', linkId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('signature_links')
        .update({
          status: 'revocado',
          expires_at: new Date().toISOString(),
        })
        .eq('id', linkId);

      if (error) throw error;
      return link?.sale_id;
    },
    onSuccess: (saleId) => {
      if (saleId) {
        queryClient.invalidateQueries({ queryKey: ['signature-links', saleId] });
      }
      toast({
        title: 'Enlace revocado',
        description: 'El enlace de firma ha sido revocado.',
      });
    },
  });
};

export const useResendSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (oldLink: {
      id: string;
      sale_id: string;
      recipient_type: string;
      recipient_id: string | null;
      recipient_email: string;
      recipient_phone: string | null;
    }) => {
      // 1. Revoke old link
      await supabase
        .from('signature_links')
        .update({
          status: 'revocado',
          expires_at: new Date().toISOString(),
        })
        .eq('id', oldLink.id);

      // 2. Reset document statuses for this recipient instead of deleting them
      // This preserves the generated documents so they don't need to be regenerated
      if (oldLink.recipient_type === 'adherente' && oldLink.recipient_id) {
        // For adherente: reset status of documents tied to this beneficiary
        await supabase
          .from('documents')
          .update({ status: 'pendiente' as any, signature_data: null, signed_at: null, signed_by: null, is_final: false })
          .eq('sale_id', oldLink.sale_id)
          .eq('beneficiary_id', oldLink.recipient_id);
      } else {
        // For titular: reset status of generated documents without beneficiary_id
        await supabase
          .from('documents')
          .update({ status: 'pendiente' as any, signature_data: null, signed_at: null, signed_by: null, is_final: false })
          .eq('sale_id', oldLink.sale_id)
          .is('beneficiary_id', null)
          .eq('generated_from_template', true);

        // Also reset standalone firma documents
        await supabase
          .from('documents')
          .delete()
          .eq('sale_id', oldLink.sale_id)
          .is('beneficiary_id', null)
          .eq('document_type', 'firma');
      }

      // 3. Create new link with same recipient data
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const { data, error } = await supabase
        .from('signature_links')
        .insert({
          sale_id: oldLink.sale_id,
          token,
          recipient_type: oldLink.recipient_type,
          recipient_email: oldLink.recipient_email || '',
          recipient_phone: oldLink.recipient_phone || null,
          recipient_id: oldLink.recipient_id || null,
          expires_at: expiresAt.toISOString(),
          status: 'pendiente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signature-links', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['sale-documents', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['signed-documents', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sale-generated-documents', data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ['signature-link-documents'] });
      toast({
        title: 'Enlace reenviado',
        description: 'Se ha generado un nuevo enlace de firma. Los documentos se mantienen y podrán ser firmados nuevamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reenviar el enlace.',
        variant: 'destructive',
      });
    },
  });
};
