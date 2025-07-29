
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Template = Database['public']['Tables']['templates']['Row'];
type TemplateInsert = Database['public']['Tables']['templates']['Insert'];

interface TemplateVersion {
  id: string;
  version: number;
  name: string;
  description?: string;
  content: any;
  static_content?: string;
  dynamic_fields?: any[];
  created_at: string;
  created_by?: string;
  parent_template_id?: string;
  is_current: boolean;
}

export const useTemplateVersioning = (templateId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener versiones de un template
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .or(`id.eq.${templateId},parent_template_id.eq.${templateId}`)
        .order('version', { ascending: false });

      if (error) throw error;
      
      return data.map(template => ({
        id: template.id,
        version: template.version || 1,
        name: template.name,
        description: template.description,
        content: template.content,
        static_content: template.static_content,
        dynamic_fields: template.dynamic_fields,
        created_at: template.created_at!,
        created_by: template.created_by,
        parent_template_id: template.parent_template_id,
        is_current: template.id === templateId,
      })) as TemplateVersion[];
    },
    enabled: !!templateId,
  });

  // Crear nueva versión
  const createVersionMutation = useMutation({
    mutationFn: async ({ 
      templateId, 
      updates, 
      versionNotes 
    }: { 
      templateId: string; 
      updates: Partial<TemplateInsert>; 
      versionNotes?: string; 
    }) => {
      console.log('Creating new version for template:', templateId);
      
      // Obtener la versión actual
      const { data: currentTemplate, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      const nextVersion = (currentTemplate.version || 1) + 1;
      
      // Crear nueva versión
      const { data: newVersion, error: createError } = await supabase
        .from('templates')
        .insert({
          ...updates,
          name: currentTemplate.name,
          company_id: currentTemplate.company_id,
          parent_template_id: currentTemplate.parent_template_id || templateId,
          version: nextVersion,
          created_by: currentTemplate.created_by,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Actualizar template actual con la nueva versión
      const { error: updateError } = await supabase
        .from('templates')
        .update({
          ...updates,
          version: nextVersion,
        })
        .eq('id', templateId);

      if (updateError) throw updateError;

      return newVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-versions'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Nueva versión creada",
        description: "Se ha creado una nueva versión del template exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating version:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la nueva versión.",
        variant: "destructive",
      });
    },
  });

  // Restaurar versión anterior
  const restoreVersionMutation = useMutation({
    mutationFn: async ({ templateId, versionId }: { templateId: string; versionId: string }) => {
      console.log('Restoring version:', versionId, 'for template:', templateId);
      
      // Obtener la versión a restaurar
      const { data: versionToRestore, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;

      // Obtener versión actual para el siguiente número
      const { data: currentTemplate, error: currentError } = await supabase
        .from('templates')
        .select('version')
        .eq('id', templateId)
        .single();

      if (currentError) throw currentError;

      const nextVersion = (currentTemplate.version || 1) + 1;

      // Actualizar template actual con datos de la versión anterior
      const { error: updateError } = await supabase
        .from('templates')
        .update({
          content: versionToRestore.content,
          static_content: versionToRestore.static_content,
          dynamic_fields: versionToRestore.dynamic_fields,
          description: versionToRestore.description,
          version: nextVersion,
        })
        .eq('id', templateId);

      if (updateError) throw updateError;

      return versionToRestore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-versions'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Versión restaurada",
        description: "Se ha restaurado la versión seleccionada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo restaurar la versión.",
        variant: "destructive",
      });
    },
  });

  // Eliminar versión
  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      console.log('Deleting version:', versionId);
      
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', versionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-versions'] });
      toast({
        title: "Versión eliminada",
        description: "La versión ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting version:', error);
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
