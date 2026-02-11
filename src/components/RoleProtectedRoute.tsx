import React from 'react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import type { AppRole } from '@/types/roles';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { role, isLoadingRole } = useRolePermissions();

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-sm text-muted-foreground">Validando permisos...</div>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acceso denegado</h2>
          <p className="text-sm text-muted-foreground">
            Tu rol actual no tiene permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

