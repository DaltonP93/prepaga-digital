import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type DocumentAccessLogRow = Database['public']['Tables']['document_access_logs']['Row'];

export const useDocumentTracking = (documentId?: string) => {
  const queryClient = useQueryClient();

  const { data: trackingRecords, isLoading } = useQuery({
    queryKey: ['document-tracking', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from('document_access_logs')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!documentId,
  });

  const createTrackingRecord = useMutation({
    mutationFn: async (record: { document_id: string; access_type: string }) => {
      const { data, error } = await supabase
        .from('document_access_logs')
        .insert({
          document_id: record.document_id,
          access_type: record.access_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tracking', documentId] });
    },
  });

  return {
    trackingRecords,
    isLoading,
    createTrackingRecord: createTrackingRecord.mutate,
    isCreating: createTrackingRecord.isPending,
  };
};
