
import React from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import AuditDashboard from '@/components/AuditDashboard';

const AuditDashboardPage = () => {
  return (
    <RequireAuth allowedRoles={['auditor', 'super_admin', 'admin']}>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard de Auditoría</h1>
          <p className="text-muted-foreground">
            Gestiona y supervisa todos los procesos de auditoría
          </p>
        </div>
        <AuditDashboard />
      </div>
    </RequireAuth>
  );
};

export default AuditDashboardPage;
