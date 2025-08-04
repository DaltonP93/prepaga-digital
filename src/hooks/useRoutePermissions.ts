
import { useHasPermission } from './usePermissions';
import { useAuthContext } from '@/components/AuthProvider';

export const useRoutePermissions = () => {
  const { profile } = useAuthContext();
  
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
