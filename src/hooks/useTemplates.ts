
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Template = Tables<"templates">;
type TemplateInsert = TablesInsert<"templates">;
type TemplateUpdate = TablesUpdate<"templates">;

export const useTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      console.log("Fetching templates...");
      const { data, error } = await supabase
        .from("templates")
        .select(`
          *,
          company:companies(name),
          creator:profiles!templates_created_by_fkey(first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching templates:", error);
        throw error;
      }

      console.log("Templates fetched:", data);
      return data;
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: TemplateInsert) => {
      console.log("Creating template:", template);
      const { data, error } = await supabase
        .from("templates")
        .insert([template])
        .select()
        .single();

      if (error) {
        console.error("Error creating template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Template creado",
        description: "El template se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el template.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TemplateUpdate }) => {
      console.log("Updating template:", id, updates);
      const { data, error } = await supabase
        .from("templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Template actualizado",
        description: "El template se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el template.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting template:", id);
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting template:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Template eliminado",
        description: "El template se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el template.",
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
};
