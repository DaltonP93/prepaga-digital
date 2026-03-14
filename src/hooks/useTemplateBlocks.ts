import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import type { TemplateBlock, TemplateBlockInsert, TemplateBlockUpdate } from '@/types/templateDesigner';

export const useTemplateBlocks = (templateId?: string) => {
  return useQuery({
    queryKey: ['template-blocks', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('template_blocks')
        .select('*')
        .eq('template_id', templateId)
        .order('page', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as TemplateBlock[];
    },
    enabled: !!templateId,
  });
};

export const useCreateTemplateBlock = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (block: TemplateBlockInsert) => {
      const { data, error } = await supabase
        .from('template_blocks')
        .insert({
          ...block,
          content: block.content as unknown as Json,
          style: block.style as unknown as Json,
          visibility_rules: block.visibility_rules as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TemplateBlock;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-blocks', data.template_id] });
    },
    onError: (error: any) => {
      toast({ title: 'Error al crear bloque', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateTemplateBlock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TemplateBlockUpdate) => {
      const payload: Record<string, unknown> = { ...updates };
      if ('content' in payload) payload.content = payload.content as unknown as Json;
      if ('style' in payload) payload.style = payload.style as unknown as Json;
      if ('visibility_rules' in payload) payload.visibility_rules = payload.visibility_rules as unknown as Json;

      const { data, error } = await supabase
        .from('template_blocks')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TemplateBlock;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-blocks', data.template_id] });
    },
  });
};

export const useDeleteTemplateBlock = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase.from('template_blocks').delete().eq('id', id);
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      toast({ title: 'Bloque eliminado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useReorderTemplateBlocks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blocks, templateId }: { blocks: { id: string; sort_order: number }[]; templateId: string }) => {
      const promises = blocks.map(({ id, sort_order }) =>
        supabase.from('template_blocks').update({ sort_order }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
    },
  });
};
