import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type TemplatePlaceholder = Tables<"template_placeholders">;
type TemplatePlaceholderInsert = TablesInsert<"template_placeholders">;
type TemplatePlaceholderUpdate = TablesUpdate<"template_placeholders">;

export const useTemplatePlaceholders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: placeholders, isLoading } = useQuery({
    queryKey: ["template-placeholders"],
    queryFn: async () => {
      console.log("Fetching template placeholders...");
      const { data, error } = await supabase
        .from("template_placeholders")
        .select("*")
        .order("placeholder_label", { ascending: true });

      if (error) {
        console.error("Error fetching template placeholders:", error);
        throw error;
      }

      console.log("Template placeholders fetched:", data);
      return data;
    },
  });

  const createPlaceholderMutation = useMutation({
    mutationFn: async (placeholder: TemplatePlaceholderInsert) => {
      console.log("Creating template placeholder:", placeholder);
      const { data, error } = await supabase
        .from("template_placeholders")
        .insert([placeholder])
        .select()
        .single();

      if (error) {
        console.error("Error creating template placeholder:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-placeholders"] });
      toast({
        title: "Placeholder creado",
        description: "El placeholder se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error creating template placeholder:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el placeholder.",
        variant: "destructive",
      });
    },
  });

  const updatePlaceholderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TemplatePlaceholderUpdate }) => {
      console.log("Updating template placeholder:", id, updates);
      const { data, error } = await supabase
        .from("template_placeholders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating template placeholder:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-placeholders"] });
      toast({
        title: "Placeholder actualizado",
        description: "El placeholder se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error updating template placeholder:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el placeholder.",
        variant: "destructive",
      });
    },
  });

  const deletePlaceholderMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting template placeholder:", id);
      const { error } = await supabase
        .from("template_placeholders")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting template placeholder:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-placeholders"] });
      toast({
        title: "Placeholder eliminado",
        description: "El placeholder se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error deleting template placeholder:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el placeholder.",
        variant: "destructive",
      });
    },
  });

  return {
    placeholders,
    isLoading,
    createPlaceholder: createPlaceholderMutation.mutate,
    updatePlaceholder: updatePlaceholderMutation.mutate,
    deletePlaceholder: deletePlaceholderMutation.mutate,
    isCreating: createPlaceholderMutation.isPending,
    isUpdating: updatePlaceholderMutation.isPending,
    isDeleting: deletePlaceholderMutation.isPending,
  };
};