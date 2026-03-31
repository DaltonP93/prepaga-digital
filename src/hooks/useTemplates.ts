import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Template = Database['public']['Tables']['templates']['Row'] & {
  company?: { name: string } | null;
  creator?: { first_name: string; last_name: string } | null;
  question_count?: number;
};

type TemplateInsert = Database['public']['Tables']['templates']['Insert'];
type TemplateUpdate = Database['public']['Tables']['templates']['Update'];

export const useTemplates = () => {
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data: templatesData, error } = await supabase
        .from('templates')
        .select(`
          id, name, description, is_active, version, created_at, created_by,
          company_id, designer_version, template_type,
          company:company_id(name),
          template_questions(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const creatorIds = [...new Set(templatesData?.map((template) => template.created_by).filter(Boolean) || [])];
      let creatorsMap: Record<string, { first_name: string; last_name: string }> = {};

      if (creatorIds.length > 0) {
        const { data: creators, error: creatorsError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', creatorIds);

        if (creatorsError) throw creatorsError;

        creatorsMap = (creators || []).reduce((acc, creator) => {
          acc[creator.id] = {
            first_name: creator.first_name || '',
            last_name: creator.last_name || '',
          };
          return acc;
        }, {} as Record<string, { first_name: string; last_name: string }>);
      }

      return (templatesData || []).map((template) => ({
        ...template,
        creator: template.created_by && creatorsMap[template.created_by]
          ? creatorsMap[template.created_by]
          : null,
        question_count: template.template_questions?.length || 0,
      }));
    },
  });

  return { templates, isLoading, error };
};

export const useCreateTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: TemplateInsert) => {
      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template creado',
        description: 'El template ha sido creado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el template.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TemplateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] });
      toast({
        title: 'Template actualizado',
        description: 'Los cambios han sido guardados exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el template.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error: questionsError } = await supabase
        .from('template_questions')
        .delete()
        .eq('template_id', templateId);

      if (questionsError) throw questionsError;

      const { error: templateError } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (templateError) throw templateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Template eliminado',
        description: 'El template ha sido eliminado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el template.',
        variant: 'destructive',
      });
    },
  });
};

export const useTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          template_questions(
            id,
            question_text,
            question_type,
            is_required,
            sort_order,
            template_question_options(
              id,
              option_text,
              option_value,
              sort_order
            )
          )
        `)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
};
