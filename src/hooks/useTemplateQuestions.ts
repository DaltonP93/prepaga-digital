
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTemplateQuestions = (templateId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['template-questions', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      console.log('Fetching questions for template:', templateId);
      
      const { data, error } = await supabase
        .from('template_questions')
        .select(`
          *,
          template_question_options(*)
        `)
        .eq('template_id', templateId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching template questions:', error);
        throw error;
      }

      console.log('Template questions fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!templateId,
    retry: 2,
  });

  const createQuestion = useMutation({
    mutationFn: async (questionData: any) => {
      const { data, error } = await supabase
        .from('template_questions')
        .insert(questionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      toast({
        title: 'Pregunta creada',
        description: 'La pregunta se ha creado exitosamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating question:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la pregunta.',
        variant: 'destructive',
      });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('template_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      toast({
        title: 'Pregunta actualizada',
        description: 'La pregunta se ha actualizado exitosamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating question:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la pregunta.',
        variant: 'destructive',
      });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('template_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      toast({
        title: 'Pregunta eliminada',
        description: 'La pregunta se ha eliminado exitosamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la pregunta.',
        variant: 'destructive',
      });
    },
  });

  const createOption = useMutation({
    mutationFn: async (optionData: any) => {
      const { data, error } = await supabase
        .from('template_question_options')
        .insert(optionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      toast({
        title: 'Opción creada',
        description: 'La opción se ha creado exitosamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating option:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la opción.',
        variant: 'destructive',
      });
    },
  });

  const deleteOption = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase
        .from('template_question_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      toast({
        title: 'Opción eliminada',
        description: 'La opción se ha eliminado exitosamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting option:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la opción.',
        variant: 'destructive',
      });
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (reorderedQuestions: { id: string; order_index: number }[]) => {
      const updates = reorderedQuestions.map(({ id, order_index }) =>
        supabase
          .from('template_questions')
          .update({ order_index })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error('Error reordering questions');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      toast({
        title: 'Orden actualizado',
        description: 'El orden de las preguntas se ha actualizado.',
      });
    },
    onError: (error: any) => {
      console.error('Error reordering questions:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el orden.',
        variant: 'destructive',
      });
    },
  });

  return {
    questions,
    isLoading,
    error,
    createQuestion: createQuestion.mutateAsync,
    updateQuestion: updateQuestion.mutate,
    deleteQuestion: deleteQuestion.mutate,
    createOption: createOption.mutateAsync,
    deleteOption: deleteOption.mutate,
    reorderQuestions: reorderQuestions.mutate,
    isCreating: createQuestion.isPending,
    isUpdating: updateQuestion.isPending,
    isDeleting: deleteQuestion.isPending,
  };
};
