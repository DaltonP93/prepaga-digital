
import React from 'react';
import { useHasPermission } from '@/hooks/usePermissions';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

interface ProtectedComponentProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  permission,
  children,
  fallback = null
}) => {
  const { profile } = useSimpleAuthContext();
  const { data: hasPermission, isLoading } = useHasPermission(permission);

  // Super admins tienen acceso a todo
  if (profile?.role === 'super_admin') {
    return <>{children}</>;
  }

  if (isLoading) {
    return null; // O un skeleton/loading si prefieres
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
