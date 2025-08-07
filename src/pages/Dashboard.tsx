
import { Layout } from '@/components/Layout';
import DashboardWidgets from '@/components/DashboardWidgets';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

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
    <Layout title="Dashboard" description="Panel de control principal">
      <div className="space-y-6">
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold mb-2">
            Dashboard Principal
          </h1>
          <p className="text-muted-foreground">
            Bienvenido al sistema de firma digital
          </p>
        </div>

        <DashboardWidgets />
      </div>
    </Layout>
  );
};

export default Dashboard;
