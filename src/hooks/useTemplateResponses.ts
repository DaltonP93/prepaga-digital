import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type TemplateResponse = Tables<"template_responses">;
type TemplateResponseInsert = TablesInsert<"template_responses">;

export const useTemplateResponses = (templateId?: string, clientId?: string, saleId?: string) => {
  const queryClient = useQueryClient();

  // Fetch responses for a specific template and sale
  const { data: responses, isLoading } = useQuery({
    queryKey: ["template-responses", templateId, saleId],
    queryFn: async () => {
      if (!templateId) return [];
      
      let query = supabase
        .from("template_responses")
        .select(`
          *,
          template_questions(question_text, question_type)
        `)
        .eq("template_id", templateId);

      if (saleId) {
        query = query.eq("sale_id", saleId);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!templateId,
  });

  // Fetch aggregated responses for analytics
  const { data: responseStats } = useQuery({
    queryKey: ["template-response-stats", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from("template_responses")
        .select("question_id, response_value")
        .eq("template_id", templateId);

      if (error) throw error;

      // Group responses by question
      const stats: Record<string, { total: number; responses: Record<string, number> }> = {};
      
      data?.forEach((response) => {
        if (!stats[response.question_id]) {
          stats[response.question_id] = { total: 0, responses: {} };
        }
        
        stats[response.question_id].total++;
        
        const value = response.response_value;
        if (!stats[response.question_id].responses[value]) {
          stats[response.question_id].responses[value] = 0;
        }
        stats[response.question_id].responses[value]++;
      });

      return stats;
    },
    enabled: !!templateId,
  });

  // Create/update responses mutation
  const saveResponsesMutation = useMutation({
    mutationFn: async (responsesData: TemplateResponseInsert[]) => {
      // First, delete existing responses for this sale and template
      if (responsesData.length > 0) {
        const firstResponse = responsesData[0];
        await supabase
          .from("template_responses")
          .delete()
          .eq("template_id", firstResponse.template_id)
          .eq("sale_id", firstResponse.sale_id);
      }

      // Then insert new responses
      const { data, error } = await supabase
        .from("template_responses")
        .insert(responsesData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-responses"] });
      queryClient.invalidateQueries({ queryKey: ["template-response-stats"] });
      toast.success("Respuestas guardadas exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar las respuestas");
    },
  });

  // Delete responses mutation
  const deleteResponsesMutation = useMutation({
    mutationFn: async ({ templateId, saleId }: { templateId: string; saleId: string }) => {
      const { error } = await supabase
        .from("template_responses")
        .delete()
        .eq("template_id", templateId)
        .eq("sale_id", saleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-responses"] });
      queryClient.invalidateQueries({ queryKey: ["template-response-stats"] });
      toast.success("Respuestas eliminadas exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar las respuestas");
    },
  });

  return {
    responses: responses || [],
    responseStats,
    isLoading,
    saveResponses: saveResponsesMutation.mutateAsync,
    deleteResponses: deleteResponsesMutation.mutateAsync,
    isSaving: saveResponsesMutation.isPending,
    isDeleting: deleteResponsesMutation.isPending,
  };
};