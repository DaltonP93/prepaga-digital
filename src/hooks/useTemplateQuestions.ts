import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type TemplateQuestion = Tables<"template_questions">;
type TemplateQuestionInsert = TablesInsert<"template_questions">;
type TemplateQuestionUpdate = TablesUpdate<"template_questions">;
type TemplateQuestionOption = Tables<"template_question_options">;
type TemplateQuestionOptionInsert = TablesInsert<"template_question_options">;

export const useTemplateQuestions = (templateId?: string) => {
  const queryClient = useQueryClient();

  // Fetch questions for a template
  const { data: questions, isLoading } = useQuery({
    queryKey: ["template-questions", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("template_questions")
        .select(`
          *,
          template_question_options(*)
        `)
        .eq("template_id", templateId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (question: TemplateQuestionInsert) => {
      const { data, error } = await supabase
        .from("template_questions")
        .insert(question)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-questions"] });
      toast.success("Pregunta creada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear la pregunta");
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TemplateQuestionUpdate }) => {
      const { data, error } = await supabase
        .from("template_questions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-questions"] });
      toast.success("Pregunta actualizada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar la pregunta");
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-questions"] });
      toast.success("Pregunta eliminada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar la pregunta");
    },
  });

  // Create question option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (option: TemplateQuestionOptionInsert) => {
      const { data, error } = await supabase
        .from("template_question_options")
        .insert(option)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-questions"] });
      toast.success("Opción creada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear la opción");
    },
  });

  // Delete question option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_question_options")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-questions"] });
      toast.success("Opción eliminada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar la opción");
    },
  });

  // Reorder questions mutation
  const reorderQuestionsMutation = useMutation({
    mutationFn: async (questions: { id: string; order_index: number }[]) => {
      const updates = questions.map(({ id, order_index }) => 
        supabase
          .from("template_questions")
          .update({ order_index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-questions"] });
      toast.success("Orden actualizado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar el orden");
    },
  });

  return {
    questions: questions || [],
    isLoading,
    createQuestion: createQuestionMutation.mutateAsync,
    updateQuestion: updateQuestionMutation.mutateAsync,
    deleteQuestion: deleteQuestionMutation.mutateAsync,
    createOption: createOptionMutation.mutateAsync,
    deleteOption: deleteOptionMutation.mutateAsync,
    reorderQuestions: reorderQuestionsMutation.mutateAsync,
    isCreating: createQuestionMutation.isPending,
    isUpdating: updateQuestionMutation.isPending,
    isDeleting: deleteQuestionMutation.isPending,
  };
};