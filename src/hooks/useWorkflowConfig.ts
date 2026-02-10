import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { WorkflowConfig } from '@/types/workflow';

export interface WorkflowConfigRow {
  id: string;
  company_id: string;
  workflow_config: WorkflowConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const useWorkflowConfig = (companyId: string | undefined) => {
  return useQuery({
    queryKey: ['workflow-config', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_workflow_config' as any)
        .select('*')
        .eq('company_id', companyId!)
        .maybeSingle();

      if (error) throw error;
      return data as WorkflowConfigRow | null;
    },
    enabled: !!companyId,
  });
};

export const useUpsertWorkflowConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      workflowConfig,
      isActive,
    }: {
      companyId: string;
      workflowConfig: WorkflowConfig;
      isActive: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('company_workflow_config' as any)
        .upsert(
          {
            company_id: companyId,
            workflow_config: workflowConfig as any,
            is_active: isActive,
            updated_by: user?.user?.id || null,
          },
          { onConflict: 'company_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-config', variables.companyId] });
      toast.success('Configuracion de flujo actualizada');
    },
    onError: (error: any) => {
      toast.error('Error al guardar configuracion: ' + error.message);
    },
  });
};
