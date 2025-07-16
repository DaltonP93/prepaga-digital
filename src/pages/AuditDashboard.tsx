import { Layout } from '@/components/Layout';
import { AuditLogViewer } from '@/components/AuditLogViewer';

const AuditDashboard = () => {
  return (
    <Layout title="Auditoría del Sistema">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auditoría del Sistema</h1>
          <p className="text-muted-foreground">
            Monitoreo completo de actividades y accesos al sistema
          </p>
        </div>
        
        <AuditLogViewer />
      </div>
    </Layout>
  );
};

export default AuditDashboard;