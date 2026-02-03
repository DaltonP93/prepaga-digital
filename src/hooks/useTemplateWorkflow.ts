import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

// Types matching the actual database schema

export interface TemplateWorkflowState {
  id: string;
  template_id: string;
  state_name: string;
  state_order: number;
  is_final: boolean;
  created_at: string;
}

export interface TemplateComment {
  id: string;
  template_id: string;
  user_id: string | null;
  comment_text: string;
  created_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  content: string | null;
  created_by: string | null;
  created_at: string;
}

export const useTemplateWorkflow = (templateId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get workflow states
  const {
    data: workflowStates,
    isLoading: isLoadingStates,
    error: statesError,
  } = useQuery({
    queryKey: ["template-workflow-states", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_workflow_states")
        .select("*")
        .eq("template_id", templateId)
        .order("state_order", { ascending: true });

      if (error) throw error;
      return data as TemplateWorkflowState[];
    },
    enabled: !!templateId,
  });

  // Get current state (last one by order)
  const currentState = workflowStates?.[workflowStates.length - 1];

  // Track analytics (views, etc.)
  const trackEventMutation = useMutation({
    mutationFn: async ({
      templateId,
    }: {
      templateId: string;
      eventType?: string;
      metadata?: Record<string, any>;
    }) => {
      // Update views_count in template_analytics
      const { data: existing } = await supabase
        .from("template_analytics")
        .select("id, views_count")
        .eq("template_id", templateId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("template_analytics")
          .update({
            views_count: (existing.views_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      }
    },
  });

  return {
    workflowStates,
    currentState,
    isLoadingStates,
    statesError,
    trackEvent: trackEventMutation.mutate,
  };
};

export const useTemplateComments = (templateId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get comments
  const {
    data: comments,
    isLoading: isLoadingComments,
    error: commentsError,
  } = useQuery({
    queryKey: ["template-comments", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_comments")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TemplateComment[];
    },
    enabled: !!templateId,
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async ({
      templateId,
      content,
    }: {
      templateId: string;
      content: string;
      parentCommentId?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("template_comments")
        .insert({
          template_id: templateId,
          user_id: user.id,
          comment_text: content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-comments"] });
      toast({
        title: "Comentario agregado",
        description: "El comentario ha sido agregado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al agregar comentario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    comments,
    isLoadingComments,
    commentsError,
    addComment: addCommentMutation.mutate,
    isAddingComment: addCommentMutation.isPending,
  };
};

export const useTemplateVersions = (templateId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get versions
  const {
    data: versions,
    isLoading: isLoadingVersions,
    error: versionsError,
  } = useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return data as TemplateVersion[];
    },
    enabled: !!templateId,
  });

  // Create new version
  const createVersionMutation = useMutation({
    mutationFn: async ({
      templateId,
      changeNotes,
    }: {
      templateId: string;
      changeNotes?: string;
    }) => {
      // Get current template data
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("content")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Get next version number
      const { data: lastVersion } = await supabase
        .from("template_versions")
        .select("version_number")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (lastVersion?.version_number || 0) + 1;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("template_versions")
        .insert({
          template_id: templateId,
          version_number: nextVersion,
          content: template.content,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast({
        title: "Versión creada",
        description: "Se ha creado una nueva versión del template",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear versión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revert to version
  const revertToVersionMutation = useMutation({
    mutationFn: async ({ versionId }: { versionId: string }) => {
      // Get version data
      const { data: version, error: versionError } = await supabase
        .from("template_versions")
        .select("*")
        .eq("id", versionId)
        .single();

      if (versionError) throw versionError;

      // Update template with version data
      const { data, error } = await supabase
        .from("templates")
        .update({
          content: version.content,
        })
        .eq("id", version.template_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast({
        title: "Template revertido",
        description: "El template ha sido revertido a la versión seleccionada",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al revertir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    versions,
    isLoadingVersions,
    versionsError,
    createVersion: createVersionMutation.mutate,
    isCreatingVersion: createVersionMutation.isPending,
    revertToVersion: revertToVersionMutation.mutate,
    isReverting: revertToVersionMutation.isPending,
  };
};
