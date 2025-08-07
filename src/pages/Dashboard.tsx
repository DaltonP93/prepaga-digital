
import { Layout } from '@/components/Layout';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import DashboardMetricsWidget from '@/components/widgets/DashboardMetricsWidget';
import RecentContractsWidget from '@/components/widgets/RecentContractsWidget';
import QuickActionsWidget from '@/components/widgets/QuickActionsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const { user, loading } = useSimpleAuthContext();

  console.log('📊 Dashboard: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email 
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Dashboard" description="Resumen general de contratos y firmas digitales">
      <div className="space-y-8">
        {/* Métricas principales */}
        <DashboardMetricsWidget />

        {/* Sección principal con widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contratos recientes - ocupa 2 columnas */}
          <div className="lg:col-span-2">
            <RecentContractsWidget />
          </div>
          
          {/* Acciones rápidas - ocupa 1 columna */}
          <div className="lg:col-span-1">
            <QuickActionsWidget />
          </div>
        </div>

        {/* Widget de actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">Contrato firmado</div>
                  <div className="text-sm text-muted-foreground">CON-2025-001 • hace 2h</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">Nuevo contrato creado</div>
                  <div className="text-sm text-muted-foreground">CON-2025-002 • hace 3h</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">Recordatorio enviado</div>
                  <div className="text-sm text-muted-foreground">Cliente pendiente • hace 5h</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
