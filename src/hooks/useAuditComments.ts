import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuditComment {
  id: string;
  sale_id: string;
  user_id: string;
  comment: string;
  sale_status_at_comment: string | null;
  audit_action: 'approve' | 'reject' | 'comment' | 'return' | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

export const useAuditComments = (saleId?: string) => {
  return useQuery({
    queryKey: ['audit-comments', saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_comments')
        .select('*')
        .eq('sale_id', saleId!)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map((c) => (c as Record<string, unknown>).user_id as string).filter(Boolean))];
      let profilesMap: Record<string, unknown> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, unknown>);
      }

      return (data || []).map((comment) => ({
        ...(comment as Record<string, unknown>),
        profiles: profilesMap[(comment as Record<string, unknown>).user_id as string] || null,
      })) as AuditComment[];
    },
  });
};

export const useCreateAuditComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      comment,
      saleStatus,
      auditAction,
    }: {
      saleId: string;
      comment: string;
      saleStatus?: string;
      auditAction?: 'approve' | 'reject' | 'comment' | 'return';
    }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user?.id) throw new Error('No autenticado');

      const { data, error } = await supabase
        .from('audit_comments')
        .insert({
          sale_id: saleId,
          user_id: currentUser.user.id,
          comment,
          sale_status_at_comment: saleStatus || null,
          audit_action: auditAction || 'comment',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-comments', variables.saleId] });
      toast.success('Comentario de auditoría registrado');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Error al registrar comentario');
    },
  });
};
