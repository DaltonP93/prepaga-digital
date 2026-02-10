
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

export const useRoutePermissions = () => {
  const { userRole } = useSimpleAuthContext();
  
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';
  const isSupervisor = userRole === 'supervisor';
  const isAuditor = userRole === 'auditor';

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
    canViewAnalytics: isSuperAdmin || isAdmin || isSupervisor,
    canViewUsers: isSuperAdmin || isSupervisor,
    canViewCompanies: isSuperAdmin,
    canViewAudit: isSuperAdmin || isAdmin || isSupervisor || isAuditor,
    canViewExperience: isSuperAdmin || isAdmin,
    isSuperAdmin,
  };
};
