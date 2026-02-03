import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type DashboardWidgetRow = Database['public']['Tables']['dashboard_widgets']['Row'];
type DashboardWidgetInsert = Database['public']['Tables']['dashboard_widgets']['Insert'];

const DEFAULT_WIDGETS: Omit<DashboardWidgetInsert, 'user_id'>[] = [
  { widget_type: 'sales_overview', position: 0, is_visible: true, config: {} },
  { widget_type: 'recent_clients', position: 1, is_visible: true, config: {} },
  { widget_type: 'notifications', position: 2, is_visible: true, config: {} },
  { widget_type: 'quick_actions', position: 3, is_visible: true, config: {} },
  { widget_type: 'sales_by_user', position: 4, is_visible: true, config: {} },
  { widget_type: 'conversion_metrics', position: 5, is_visible: true, config: {} },
  { widget_type: 'analytics_chart', position: 6, is_visible: false, config: {} },
  { widget_type: 'pending_documents', position: 7, is_visible: false, config: {} }
];

export const useDashboardWidgets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: widgets = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;

      // Si no hay widgets, crear los por defecto
      if (!data || data.length === 0) {
        const defaultWidgets = DEFAULT_WIDGETS.map(widget => ({
          ...widget,
          user_id: userData.user.id
        }));

        const { data: createdWidgets, error: createError } = await supabase
          .from('dashboard_widgets')
          .insert(defaultWidgets)
          .select();

        if (createError) throw createError;
        return createdWidgets || [];
      }

      return data || [];
    }
  });

  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DashboardWidgetRow> }) => {
      const { error } = await supabase
        .from('dashboard_widgets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el widget",
        variant: "destructive"
      });
    }
  });

  const reorderWidgetsMutation = useMutation({
    mutationFn: async (reorderedWidgets: { id: string; position: number }[]) => {
      const updates = reorderedWidgets.map(({ id, position }) => 
        supabase
          .from('dashboard_widgets')
          .update({ position, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      toast({
        title: "Éxito",
        description: "Widgets reordenados correctamente"
      });
    }
  });

  const toggleWidgetVisibility = (id: string, is_visible: boolean) => {
    updateWidgetMutation.mutate({ id, updates: { is_visible } });
  };

  const updateWidgetConfig = (id: string, config: any) => {
    updateWidgetMutation.mutate({ id, updates: { config } });
  };

  const reorderWidgets = (reorderedWidgets: { id: string; position: number }[]) => {
    reorderWidgetsMutation.mutate(reorderedWidgets);
  };

  return {
    widgets,
    isLoading,
    error,
    toggleWidgetVisibility,
    updateWidgetConfig,
    reorderWidgets,
    isUpdating: updateWidgetMutation.isPending || reorderWidgetsMutation.isPending
  };
};
