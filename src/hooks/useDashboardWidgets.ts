import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  settings: any;
  created_at: string;
  updated_at: string;
}

const DEFAULT_WIDGETS: Omit<DashboardWidget, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { widget_type: 'sales_overview', position: 0, size: 'large', visible: true, settings: {} },
  { widget_type: 'recent_clients', position: 1, size: 'medium', visible: true, settings: {} },
  { widget_type: 'notifications', position: 2, size: 'medium', visible: true, settings: {} },
  { widget_type: 'quick_actions', position: 3, size: 'small', visible: true, settings: {} },
  { widget_type: 'sales_by_user', position: 4, size: 'large', visible: true, settings: {} },
  { widget_type: 'conversion_metrics', position: 5, size: 'medium', visible: true, settings: {} },
  { widget_type: 'analytics_chart', position: 6, size: 'large', visible: false, settings: {} },
  { widget_type: 'pending_documents', position: 7, size: 'medium', visible: false, settings: {} }
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
        return createdWidgets as DashboardWidget[];
      }

      return data as DashboardWidget[];
    }
  });

  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DashboardWidget> }) => {
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

  const toggleWidgetVisibility = (id: string, visible: boolean) => {
    updateWidgetMutation.mutate({ id, updates: { visible } });
  };

  const updateWidgetSize = (id: string, size: 'small' | 'medium' | 'large') => {
    updateWidgetMutation.mutate({ id, updates: { size } });
  };

  const updateWidgetSettings = (id: string, settings: any) => {
    updateWidgetMutation.mutate({ id, updates: { settings } });
  };

  const reorderWidgets = (reorderedWidgets: { id: string; position: number }[]) => {
    reorderWidgetsMutation.mutate(reorderedWidgets);
  };

  return {
    widgets,
    isLoading,
    error,
    toggleWidgetVisibility,
    updateWidgetSize,
    updateWidgetSettings,
    reorderWidgets,
    isUpdating: updateWidgetMutation.isPending || reorderWidgetsMutation.isPending
  };
};