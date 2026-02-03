/**
 * ProtectedComponent - Client-side access control wrapper
 * 
 * SECURITY NOTE: This component provides UI-level access control for UX purposes ONLY.
 * It hides UI elements from users who shouldn't see them, but it does NOT provide
 * actual security. All data access is protected by Row Level Security (RLS) policies
 * in the Supabase database which enforce permissions server-side.
 * 
 * - Never rely on this component alone for security
 * - Always ensure corresponding RLS policies exist for data protection
 * - These checks prevent confusing UX, not unauthorized access
 */
import { ReactNode } from 'react';
import { useHasPermission } from '@/hooks/usePermissions';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

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
  const { profile } = useSimpleAuthContext();
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
