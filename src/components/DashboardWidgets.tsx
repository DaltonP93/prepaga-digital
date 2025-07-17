import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import SalesOverviewWidget from './widgets/SalesOverviewWidget';
import RecentClientsWidget from './widgets/RecentClientsWidget';
import QuickActionsWidget from './widgets/QuickActionsWidget';
import NotificationsWidget from './widgets/NotificationsWidget';
import SalesByUserWidget from './widgets/SalesByUserWidget';
import ConversionMetricsWidget from './widgets/ConversionMetricsWidget';
import AdvancedAnalytics from './AdvancedAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const WIDGET_COMPONENTS = {
  'sales_overview': SalesOverviewWidget,
  'recent_clients': RecentClientsWidget,
  'notifications': NotificationsWidget,
  'quick_actions': QuickActionsWidget,
  'analytics_chart': AdvancedAnalytics,
  'sales_by_user': SalesByUserWidget,
  'conversion_metrics': ConversionMetricsWidget,
  'pending_documents': () => (
    <Card>
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Widget de documentos pendientes</p>
          <p className="text-sm">Próximamente...</p>
        </div>
      </CardContent>
    </Card>
  )
};

const DashboardWidgets = () => {
  const { widgets, isLoading } = useDashboardWidgets();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const visibleWidgets = widgets.filter(widget => widget.visible);

  const getWidgetClassName = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1 lg:col-span-1';
      case 'medium':
        return 'col-span-1 lg:col-span-2';
      case 'large':
        return 'col-span-1 lg:col-span-4';
      default:
        return 'col-span-1 lg:col-span-2';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {visibleWidgets.map((widget) => {
        const WidgetComponent = WIDGET_COMPONENTS[widget.widget_type as keyof typeof WIDGET_COMPONENTS];
        
        if (!WidgetComponent) {
          return (
            <Card key={widget.id} className={getWidgetClassName(widget.size)}>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <p>Widget desconocido: {widget.widget_type}</p>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <div key={widget.id} className={getWidgetClassName(widget.size)}>
            <WidgetComponent />
          </div>
        );
      })}
    </div>
  );
};

export default DashboardWidgets;