
import { ReactNode } from 'react';
import { useHasPermission } from '@/hooks/usePermissions';
import { useAuthContext } from '@/components/AuthProvider';

interface ProtectedComponentProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  fallback?: ReactNode;
}

export function ProtectedComponent({ 
  children, 
  permission, 
  role, 
  fallback = null 
}: ProtectedComponentProps) {
  const { profile } = useAuthContext();
  const { data: hasPermission } = useHasPermission(permission || '');

  // Super admin can access everything
  if (profile?.role === 'super_admin') {
    return <>{children}</>;
  }

  // Check role if specified
  if (role && profile?.role !== role) {
    return <>{fallback}</>;
  }

  // Check permission if specified
  if (permission && !hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
