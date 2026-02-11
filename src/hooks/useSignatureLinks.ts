
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
      expirationDays = 7,
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
