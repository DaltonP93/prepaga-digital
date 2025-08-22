
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTemplateQuestions = (templateId: string) => {
  const queryClient = useQueryClient();

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['template-questions', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      console.log('Loading questions for template:', templateId);
      
      const { data, error } = await supabase
        .from('template_questions')
        .select(`
          *,
          template_question_options (*)
        `)
        .eq('template_id', templateId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading template questions:', error);
        throw error;
      }

      console.log('Template questions loaded:', data);
      return data || [];
    },
    enabled: !!templateId,
  });

  const createQuestion = useMutation({
    mutationFn: async (questionData: {
      template_id: string;
      question_text: string;
      question_type: string;
      is_required: boolean;
      order_index: number;
      options?: { option_text: string; option_value: string }[];
    }) => {
      console.log('Creating question:', questionData);
      
      const { data: question, error: questionError } = await supabase
        .from('template_questions')
        .insert({
          template_id: questionData.template_id,
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          is_required: questionData.is_required,
          order_index: questionData.order_index,
          is_active: true,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Si tiene opciones, las insertamos
      if (questionData.options && questionData.options.length > 0) {
        const optionsData = questionData.options.map((option, index) => ({
          question_id: question.id,
          option_text: option.option_text,
          option_value: option.option_value,
          order_index: index,
        }));

        const { error: optionsError } = await supabase
          .from('template_question_options')
          .insert(optionsData);

        if (optionsError) throw optionsError;
      }

      return question;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Pregunta creada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating question:', error);
      toast.error('Error al crear la pregunta');
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        question_text: string;
        question_type: string;
        is_required: boolean;
        order_index: number;
        is_active: boolean;
      }>;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Pregunta actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating question:', error);
      toast.error('Error al actualizar la pregunta');
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      // Primero eliminamos las opciones
      await supabase
        .from('template_question_options')
        .delete()
        .eq('question_id', questionId);

      // Luego eliminamos la pregunta
      const { error } = await supabase
        .from('template_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', templateId] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Pregunta eliminada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting question:', error);
      toast.error('Error al eliminar la pregunta');
    },
  });

  return {
    questions,
    isLoading,
    error,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };
};
