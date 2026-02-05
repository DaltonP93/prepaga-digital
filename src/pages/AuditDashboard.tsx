
import React from 'react';
import { AuditorDashboard } from '@/components/audit/AuditorDashboard';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const AuditDashboardPage = () => {
  const { permissions, isAdmin, role } = useRolePermissions();

  // Check if user can view audit
  const canViewAudit = isAdmin || role === 'auditor' || role === 'supervisor';

  if (!canViewAudit) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No tienes permisos para acceder al panel de auditoría.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AuditorDashboard />;
};

export default AuditDashboardPage;
