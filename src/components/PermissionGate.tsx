import React from 'react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import type { RolePermissions } from '@/types/roles';

interface PermissionGateProps {
  children: React.ReactNode;
  resource: keyof RolePermissions;
  action: string;
  fallback?: React.ReactNode;
}

/**
 * Componente que oculta contenido basado en permisos del usuario
 * 
 * @example
 * <PermissionGate resource="sales" action="create">
 *   <Button>Nueva Venta</Button>
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  action,
  fallback = null,
}) => {
  const { permissions } = useRolePermissions();

  const resourcePermissions = permissions[resource] as Record<string, boolean>;
  const hasPermission = resourcePermissions?.[action] === true;

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface MultiPermissionGateProps {
  children: React.ReactNode;
  checks: Array<{ resource: keyof RolePermissions; action: string }>;
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
}

/**
 * Componente que verifica múltiples permisos
 * 
 * @example
 * <MultiPermissionGate
 *   checks={[
 *     { resource: 'sales', action: 'create' },
 *     { resource: 'clients', action: 'create' }
 *   ]}
 *   mode="any"
 * >
 *   <Button>Acción</Button>
 * </MultiPermissionGate>
 */
export const MultiPermissionGate: React.FC<MultiPermissionGateProps> = ({
  children,
  checks,
  mode = 'all',
  fallback = null,
}) => {
  const { canAny, canAll } = useRolePermissions();

  const hasPermission = mode === 'any' ? canAny(checks) : canAll(checks);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireSuperAdmin?: boolean;
}

/**
 * Componente que solo muestra contenido a admins
 * 
 * @example
 * <AdminGate>
 *   <SettingsPanel />
 * </AdminGate>
 */
export const AdminGate: React.FC<AdminGateProps> = ({
  children,
  fallback = null,
  requireSuperAdmin = false,
}) => {
  const { isAdmin, isSuperAdmin } = useRolePermissions();

  const hasAccess = requireSuperAdmin ? isSuperAdmin : isAdmin;

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
