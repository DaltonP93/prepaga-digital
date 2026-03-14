import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import type { TemplateField, TemplateFieldInsert, TemplateFieldUpdate } from '@/types/templateDesigner';

export const useTemplateFields = (templateId?: string) => {
  return useQuery({
    queryKey: ['template-fields', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('template_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('page', { ascending: true });
      if (error) throw error;
      return data as unknown as TemplateField[];
    },
    enabled: !!templateId,
  });
};

export const useCreateTemplateField = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: TemplateFieldInsert) => {
      const { data, error } = await supabase
        .from('template_fields')
        .insert({
          ...field,
          meta: field.meta as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TemplateField;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-fields', data.template_id] });
      toast({ title: 'Campo agregado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error al crear campo', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateTemplateField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TemplateFieldUpdate) => {
      const payload: Record<string, unknown> = { ...updates };
      if ('meta' in payload) payload.meta = payload.meta as unknown as Json;

      const { data, error } = await supabase
        .from('template_fields')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TemplateField;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-fields', data.template_id] });
    },
  });
};

export const useDeleteTemplateField = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase.from('template_fields').delete().eq('id', id);
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['template-fields', templateId] });
      toast({ title: 'Campo eliminado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
