import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyApiConfiguration } from '@/hooks/useCompanyApiConfiguration';

/**
 * Check if SignWell is enabled for the current company
 */
export const useSignWellConfig = () => {
  const { configuration, isLoading } = useCompanyApiConfiguration();

  return {
    isEnabled: configuration?.signwell_enabled && !!configuration?.signwell_api_key,
    isLoading,
  };
};

/**
 * Create a document in SignWell for signing
 */
export const useSignWellCreateDocument = () => {
  return useMutation({
    mutationFn: async ({
      name,
      fileBase64,
      fileUrl,
      recipients,
    }: {
      name: string;
      fileBase64?: string;
      fileUrl?: string;
      recipients: Array<{ name: string; email: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('signwell-proxy', {
        body: {
          action: 'create_document',
          name,
          file_base64: fileBase64,
          file_url: fileUrl,
          recipients,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error al crear documento en SignWell');

      return data as {
        success: true;
        document_id: string;
        signing_url: string;
        recipients: Array<{ id: string; embedded_signing_url: string }>;
      };
    },
  });
};

/**
 * Poll SignWell document status
 */
export const useSignWellDocumentStatus = (documentId: string | null | undefined) => {
  return useQuery({
    queryKey: ['signwell-document-status', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const { data, error } = await supabase.functions.invoke('signwell-proxy', {
        body: {
          action: 'get_status',
          document_id: documentId,
        },
      });

      if (error) throw error;
      return data?.data || null;
    },
    enabled: !!documentId,
    refetchInterval: 30000, // Poll every 30s
  });
};

/**
 * Get completed PDF URL from SignWell
 */
export const useSignWellCompletedPdf = () => {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('signwell-proxy', {
        body: {
          action: 'get_completed_pdf',
          document_id: documentId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'PDF no disponible');

      return data.pdf_url as string;
    },
  });
};
