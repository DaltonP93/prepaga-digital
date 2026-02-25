import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

export const DEFAULT_PROGRESS_CONFIG: Record<string, number> = {
  borrador: 10,
  preparando_documentos: 20,
  esperando_ddjj: 30,
  pendiente: 40,
  en_auditoria: 50,
  rechazado: 30,
  aprobado_para_templates: 60,
  listo_para_enviar: 70,
  enviado: 80,
  firmado_parcial: 85,
  firmado: 95,
  completado: 100,
  cancelado: 0,
  expirado: 0,
};

export const PROGRESS_STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  preparando_documentos: 'Preparando Documentos',
  esperando_ddjj: 'Esperando DDJJ',
  pendiente: 'Pendiente',
  en_auditoria: 'En Auditoría',
  rechazado: 'Rechazado',
  aprobado_para_templates: 'Aprobado',
  listo_para_enviar: 'Listo para Enviar',
  enviado: 'Enviado',
  firmado_parcial: 'Firmado Parcial',
  firmado: 'Firmado',
  completado: 'Completado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
};

export const useSaleProgressConfig = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: config, isLoading } = useQuery({
    queryKey: ['sale-progress-config', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from('company_ui_settings')
        .select('sale_progress_config')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sale progress config:', error);
        return null;
      }

      return (data as any)?.sale_progress_config as Record<string, number> | null;
    },
    enabled: !!profile?.company_id,
  });

  const progressConfig: Record<string, number> = {
    ...DEFAULT_PROGRESS_CONFIG,
    ...(config || {}),
  };

  const updateConfig = useMutation({
    mutationFn: async (newConfig: Record<string, number>) => {
      if (!profile?.company_id) throw new Error('No company_id');

      const { error } = await supabase
        .from('company_ui_settings')
        .upsert({
          company_id: profile.company_id,
          sale_progress_config: newConfig,
          updated_at: new Date().toISOString(),
        } as any)
        .select();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-progress-config'] });
      toast.success('Configuración de progreso guardada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al guardar la configuración');
    },
  });

  const getProgress = (status: string): number => {
    return progressConfig[status] ?? 0;
  };

  return {
    progressConfig,
    isLoading,
    getProgress,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
};
