
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
      console.log('🔍 Fetching templates...');
      
      // Fetch templates without the creator relation (no FK exists)
      const { data: templatesData, error } = await supabase
        .from('templates')
        .select(`
          *,
          company:company_id(name),
          template_questions(id)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching templates:', error);
        throw error;
      }

      // Fetch creators separately using manual pattern
      const creatorIds = [...new Set(templatesData?.map(t => t.created_by).filter(Boolean) || [])];
      let creatorsMap: Record<string, { first_name: string; last_name: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', creatorIds);
        
        if (creators) {
          creatorsMap = creators.reduce((acc, creator) => {
            acc[creator.id] = { first_name: creator.first_name || '', last_name: creator.last_name || '' };
            return acc;
          }, {} as Record<string, { first_name: string; last_name: string }>);
        }
      }

      console.log('✅ Templates fetched:', templatesData?.length || 0, 'items');
      
      // Combine data with creators and question count
      const templatesWithCreators = templatesData?.map(template => ({
        ...template,
        creator: template.created_by && creatorsMap[template.created_by] 
          ? creatorsMap[template.created_by] 
          : null,
        question_count: template.template_questions?.length || 0
      })) || [];

      return templatesWithCreators;
    },
  });

  return { templates, isLoading, error };
};

export const useCreateTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: TemplateInsert) => {
      console.log('🔨 Creating template:', templateData);
      
      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating template:', error);
        throw error;
      }
      
      console.log('✅ Template created:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Template creado",
        description: "El template ha sido creado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Template creation failed:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el template.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TemplateUpdate & { id: string }) => {
      console.log('🔄 Updating template:', id, updates);
      
      const { data, error } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating template:', error);
        throw error;
      }
      
      console.log('✅ Template updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Template actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Template update failed:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el template.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      console.log('🗑️ Deleting template:', templateId);
      
      // First, delete related template questions and options
      const { error: questionsError } = await supabase
        .from('template_questions')
        .delete()
        .eq('template_id', templateId);

      if (questionsError) {
        console.error('❌ Error deleting template questions:', questionsError);
        throw questionsError;
      }

      // Then delete the template
      const { error: templateError } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (templateError) {
        console.error('❌ Error deleting template:', templateError);
        throw templateError;
      }
      
      console.log('✅ Template deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Template eliminado",
        description: "El template ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Template deletion failed:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el template.",
        variant: "destructive",
      });
    },
  });
};

// Hook para obtener un template específico con sus preguntas
export const useTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      console.log('🔍 Fetching template:', templateId);
      
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

      if (error) {
        console.error('❌ Error fetching template:', error);
        throw error;
      }

      console.log('✅ Template fetched:', data);
      return data;
    },
    enabled: !!templateId,
  });
};
