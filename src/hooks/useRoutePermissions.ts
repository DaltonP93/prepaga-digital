
import { useHasPermission } from './usePermissions';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

export const useRoutePermissions = () => {
  const { profile } = useSimpleAuthContext();
  
  // For now, return basic permissions based on role
  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin';

  return {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: isSuperAdmin || isAdmin,
    canViewClients: true,
    canCreateClients: true,
    canViewPlans: true,
    canViewDocuments: true,
    canViewTemplates: true,
    canViewAnalytics: true,
    canViewUsers: isSuperAdmin,
    canViewCompanies: isSuperAdmin,
    canViewAudit: isSuperAdmin,
    canViewExperience: isSuperAdmin,
    isSuperAdmin
  };
};
