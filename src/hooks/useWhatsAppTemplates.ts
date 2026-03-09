import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

export interface WhatsAppTemplate {
  id: string;
  company_id: string;
  template_key: string;
  template_name: string;
  description: string | null;
  message_body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export const useWhatsAppTemplates = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('whatsapp_templates' as any)
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!profile?.company_id,
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, message_body, is_active }: { id: string; message_body?: string; is_active?: boolean }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (message_body !== undefined) updates.message_body = message_body;
      if (is_active !== undefined) updates.is_active = is_active;
      
      const { error } = await supabase
        .from('whatsapp_templates' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Plantilla actualizada');
    },
    onError: (e: any) => toast.error(e.message || 'Error al actualizar plantilla'),
  });

  return { templates: templates as WhatsAppTemplate[], isLoading, updateTemplate };
};
