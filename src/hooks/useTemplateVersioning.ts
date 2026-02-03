import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types matching the actual database schema for templates table
// (no static_content, dynamic_fields, or parent_template_id columns)

interface TemplateVersion {
  id: string;
  version: number;
  name: string;
  description?: string | null;
  content: string | null;
  created_at: string;
  created_by?: string | null;
  is_current: boolean;
}

export const useTemplateVersioning = (templateId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get versions from template_versions table
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      return data.map((v) => ({
        id: v.id,
        version: v.version_number,
        name: `Versión ${v.version_number}`,
        description: null,
        content: v.content,
        created_at: v.created_at!,
        created_by: v.created_by,
        is_current: false, // Would need to check against current template
      })) as TemplateVersion[];
    },
    enabled: !!templateId,
  });

  // Create new version
  const createVersionMutation = useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: { content?: string; description?: string };
      versionNotes?: string;
    }) => {
      console.log("Creating new version for template:", templateId);

      // Get the current template
      const { data: currentTemplate, error: fetchError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (fetchError) throw fetchError;

      const nextVersion = (currentTemplate.version || 1) + 1;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Save current state as a version
      const { error: versionError } = await supabase
        .from("template_versions")
        .insert({
          template_id: templateId,
          version_number: currentTemplate.version || 1,
          content: currentTemplate.content,
          created_by: user?.id,
        });

      if (versionError) throw versionError;

      // Update template with new content and version
      const { error: updateError } = await supabase
        .from("templates")
        .update({
          ...updates,
          version: nextVersion,
        })
        .eq("id", templateId);

      if (updateError) throw updateError;

      return { version: nextVersion };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Nueva versión creada",
        description: "Se ha creado una nueva versión del template exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating version:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la nueva versión.",
        variant: "destructive",
      });
    },
  });

  // Restore previous version
  const restoreVersionMutation = useMutation({
    mutationFn: async ({
      templateId,
      versionId,
    }: {
      templateId: string;
      versionId: string;
    }) => {
      console.log("Restoring version:", versionId, "for template:", templateId);

      // Get the version to restore
      const { data: versionToRestore, error: fetchError } = await supabase
        .from("template_versions")
        .select("*")
        .eq("id", versionId)
        .single();

      if (fetchError) throw fetchError;

      // Get current template version
      const { data: currentTemplate, error: currentError } = await supabase
        .from("templates")
        .select("version")
        .eq("id", templateId)
        .single();

      if (currentError) throw currentError;

      const nextVersion = (currentTemplate.version || 1) + 1;

      // Update template with version content
      const { error: updateError } = await supabase
        .from("templates")
        .update({
          content: versionToRestore.content,
          version: nextVersion,
        })
        .eq("id", templateId);

      if (updateError) throw updateError;

      return versionToRestore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Versión restaurada",
        description: "Se ha restaurado la versión seleccionada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error restoring version:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo restaurar la versión.",
        variant: "destructive",
      });
    },
  });

  // Delete version
  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      console.log("Deleting version:", versionId);

      const { error } = await supabase
        .from("template_versions")
        .delete()
        .eq("id", versionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast({
        title: "Versión eliminada",
        description: "La versión ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting version:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la versión.",
        variant: "destructive",
      });
    },
  });

  return {
    versions: versions || [],
    versionsLoading,
    createVersion: createVersionMutation.mutateAsync,
    restoreVersion: restoreVersionMutation.mutateAsync,
    deleteVersion: deleteVersionMutation.mutateAsync,
    isCreatingVersion: createVersionMutation.isPending,
    isRestoringVersion: restoreVersionMutation.isPending,
    isDeletingVersion: deleteVersionMutation.isPending,
  };
};
