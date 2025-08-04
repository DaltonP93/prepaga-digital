
import { Layout } from '@/components/Layout';
import DashboardWidgets from '@/components/DashboardWidgets';

const Dashboard = () => {
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
