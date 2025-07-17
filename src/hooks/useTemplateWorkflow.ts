import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

export interface TemplateWorkflowState {
  id: string;
  template_id: string;
  state: "draft" | "in_review" | "approved" | "published" | "archived";
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TemplateComment {
  id: string;
  template_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  replies?: TemplateComment[];
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  content: Record<string, any>;
  static_content: string | null;
  dynamic_fields: any[];
  created_by: string;
  created_at: string;
  change_notes: string | null;
  is_major_version: boolean;
  user?: {
    first_name: string;
    last_name: string;
  };
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
        .select(`
          *,
          changed_by_profile:profiles(first_name, last_name, avatar_url)
        `)
        .eq("template_id", templateId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (TemplateWorkflowState & {
        changed_by_profile?: {
          first_name: string;
          last_name: string;
          avatar_url: string | null;
        };
      })[];
    },
    enabled: !!templateId,
  });

  // Get current state
  const currentState = workflowStates?.[0];

  // Update workflow state
  const updateStateMutation = useMutation({
    mutationFn: async ({
      templateId,
      newState,
      notes,
    }: {
      templateId: string;
      newState: TemplateWorkflowState["state"];
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "update_template_workflow_state",
        {
          p_template_id: templateId,
          p_new_state: newState,
          p_notes: notes,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-workflow-states"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del template ha sido actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Track analytics
  const trackEventMutation = useMutation({
    mutationFn: async ({
      templateId,
      eventType,
      metadata,
    }: {
      templateId: string;
      eventType: "view" | "edit" | "pdf_generated" | "shared" | "duplicated";
      metadata?: Record<string, any>;
    }) => {
      const { error } = await supabase.from("template_analytics").insert({
        template_id: templateId,
        event_type: eventType,
        metadata: metadata || {},
      });

      if (error) throw error;
    },
  });

  return {
    workflowStates,
    currentState,
    isLoadingStates,
    statesError,
    updateState: updateStateMutation.mutate,
    isUpdatingState: updateStateMutation.isPending,
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
        .select(`
          *,
          user:profiles(first_name, last_name, avatar_url),
          resolved_by_profile:profiles!template_comments_resolved_by_fkey(first_name, last_name)
        `)
        .eq("template_id", templateId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organize comments into threads
      const commentsMap = new Map();
      const rootComments: TemplateComment[] = [];

      data.forEach((comment: any) => {
        const formattedComment = {
          ...comment,
          replies: [],
        };
        commentsMap.set(comment.id, formattedComment);

        if (!comment.parent_comment_id) {
          rootComments.push(formattedComment);
        }
      });

      // Add replies to their parent comments
      data.forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies.push(commentsMap.get(comment.id));
          }
        }
      });

      return rootComments;
    },
    enabled: !!templateId,
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async ({
      templateId,
      content,
      parentCommentId,
    }: {
      templateId: string;
      content: string;
      parentCommentId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("template_comments")
        .insert({
          template_id: templateId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId,
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

  // Resolve comment
  const resolveCommentMutation = useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      const { data, error } = await supabase
        .from("template_comments")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-comments"] });
      toast({
        title: "Comentario resuelto",
        description: "El comentario ha sido marcado como resuelto",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al resolver comentario",
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
    resolveComment: resolveCommentMutation.mutate,
    isResolvingComment: resolveCommentMutation.isPending,
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
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return data as (TemplateVersion & {
        user?: { first_name: string; last_name: string };
      })[];
    },
    enabled: !!templateId,
  });

  // Create major version
  const createMajorVersionMutation = useMutation({
    mutationFn: async ({
      templateId,
      changeNotes,
    }: {
      templateId: string;
      changeNotes: string;
    }) => {
      // Get current template data
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("content, static_content, dynamic_fields")
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("template_versions")
        .insert({
          template_id: templateId,
          version_number: nextVersion,
          content: template.content,
          static_content: template.static_content,
          dynamic_fields: template.dynamic_fields,
          created_by: user.id,
          change_notes: changeNotes,
          is_major_version: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast({
        title: "Versión major creada",
        description: "Se ha creado una nueva versión major del template",
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
          static_content: version.static_content,
          dynamic_fields: version.dynamic_fields,
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
    createMajorVersion: createMajorVersionMutation.mutate,
    isCreatingVersion: createMajorVersionMutation.isPending,
    revertToVersion: revertToVersionMutation.mutate,
    isReverting: revertToVersionMutation.isPending,
  };
};