
import { Layout } from '@/components/Layout';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import DashboardWidgets from '@/components/DashboardWidgets';

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general de contratos y firmas digitales
          </p>
        </div>
      </div>

      {/* Widgets personalizables */}
      <DashboardWidgets />
    </div>
  );
};

export default Dashboard;
