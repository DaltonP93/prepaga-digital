import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignatureLinkData {
  id: string;
  sale_id: string;
  package_id: string | null;
  token: string;
  recipient_type: string;
  recipient_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  expires_at: string;
  accessed_at: string | null;
  access_count: number;
  ip_addresses: any;
  status: string;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  sale?: {
    id: string;
    contract_number: string | null;
    status: string;
    sale_date: string;
    total_amount: number;
    clients: {
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      dni: string | null;
    } | null;
    plans: {
      name: string;
      price: number;
      description: string | null;
    } | null;
    companies: {
      name: string;
      logo_url: string | null;
      primary_color: string | null;
    } | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
  };
}

/**
 * Hook to fetch signature link data by token (for public signature page)
 */
export const useSignatureLinkByToken = (token: string) => {
  return useQuery({
    queryKey: ['signature-link-public', token],
    queryFn: async () => {
      if (!token) throw new Error('Token is required');

      console.log('Fetching signature link for token:', token);

      // First, get the signature link
      const { data: linkData, error: linkError } = await supabase
        .from('signature_links')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (linkError) {
        console.error('Error fetching signature link:', linkError);
        throw new Error('Enlace no válido o expirado');
      }

      // Increment access count
      await supabase
        .from('signature_links')
        .update({ 
          access_count: (linkData.access_count || 0) + 1,
          accessed_at: new Date().toISOString()
        })
        .eq('id', linkData.id);

      // Now get the sale data with proper relation names
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select(`
          id,
          contract_number,
          status,
          sale_date,
          total_amount,
          clients:client_id (
            first_name,
            last_name,
            email,
            phone,
            dni
          ),
          plans:plan_id (
            name,
            price,
            description
          ),
          companies:company_id (
            name,
            logo_url,
            primary_color
          )
        `)
        .eq('id', linkData.sale_id)
        .single();

      if (saleError) {
        console.error('Error fetching sale data:', saleError);
        throw new Error('No se pudo cargar la información de la venta');
      }

      return {
        ...linkData,
        sale: saleData as any,
      } as SignatureLinkData;
    },
    enabled: !!token,
    retry: 2,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to submit a signature for a signature link
 */
export const useSubmitSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      token,
      signatureData,
    }: {
      linkId: string;
      token: string;
      signatureData: string;
    }) => {
      console.log('Submitting signature for link:', linkId);

      // Get client IP (approximate - for logging purposes)
      let clientIp = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch {
        console.log('Could not fetch client IP');
      }

      // Update signature link with signature data
      const { data, error } = await supabase
        .from('signature_links')
        .update({
          status: 'completado',
          signature_data: signatureData,
          signed_ip: clientIp,
          completed_at: new Date().toISOString(),
        })
        .eq('id', linkId)
        .select()
        .single();

      if (error) {
        console.error('Error updating signature link:', error);
        throw error;
      }

      // Log the workflow step
      const { data: existingSteps } = await supabase
        .from('signature_workflow_steps')
        .select('step_order')
        .eq('signature_link_id', linkId)
        .order('step_order', { ascending: false })
        .limit(1);

      const nextStepOrder = (existingSteps?.[0]?.step_order || 0) + 1;

      await supabase
        .from('signature_workflow_steps')
        .insert({
          signature_link_id: linkId,
          step_order: nextStepOrder,
          step_type: 'signature_completed',
          status: 'completado',
          completed_at: new Date().toISOString(),
          data: {
            signed_ip: clientIp,
            user_agent: navigator.userAgent,
          },
        });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['signature-link-public', variables.token] });
      toast({
        title: "¡Firma completada!",
        description: "Su firma ha sido registrada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('Error submitting signature:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la firma. Inténtelo nuevamente.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to get documents associated with a signature link
 */
export const useSignatureLinkDocuments = (saleId: string | undefined) => {
  return useQuery({
    queryKey: ['signature-link-documents', saleId],
    queryFn: async () => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('sale_id', saleId)
        .eq('requires_signature', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!saleId,
  });
};
