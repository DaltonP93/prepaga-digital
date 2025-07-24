
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
      
      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          company:company_id(name),
          creator:created_by(first_name, last_name),
          template_questions(id)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching templates:', error);
        throw error;
      }

      console.log('✅ Templates fetched:', data?.length || 0, 'items');
      
      // Add question count to each template
      const templatesWithCount = data?.map(template => ({
        ...template,
        question_count: template.template_questions?.length || 0
      })) || [];

      return templatesWithCount;
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
      
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('❌ Error deleting template:', error);
        throw error;
      }
      
      console.log('✅ Template deleted');
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
            order_index,
            conditional_logic,
            template_question_options(
              id,
              option_text,
              option_value,
              order_index
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
