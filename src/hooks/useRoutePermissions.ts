
import { useRolePermissions } from '@/hooks/useRolePermissions';

export const useRoutePermissions = () => {
  const { role, permissions, isSuperAdmin, isAdmin, isLoadingRole } = useRolePermissions();
  const isSupervisor = role === 'supervisor';
  const isAuditor = role === 'auditor';
  const isFinanciero = role === 'financiero';

  return {
    canViewDashboard: true,
    canViewSales: !isFinanciero,
    canCreateSales: permissions.sales.create && !isFinanciero,
    canEditSales: permissions.sales.update && !isFinanciero,
    canDeleteSales: (isSuperAdmin || isAdmin) && !isFinanciero,
    canViewClients: !isFinanciero,
    canCreateClients: permissions.clients.create && !isFinanciero,
    canViewPlans: !isFinanciero,
    canViewDocuments: !isFinanciero,
    canViewTemplates: !isFinanciero,
    canViewAnalytics: permissions.analytics.viewDashboard || isSuperAdmin || isAdmin || isSupervisor || isFinanciero,
    canViewUsers: permissions.users.read || isSuperAdmin,
    canViewCompanies: isSuperAdmin,
    canViewAudit: (permissions.audit.access || isSuperAdmin || isAdmin || isSupervisor || isAuditor || isLoadingRole) && !isFinanciero,
    canViewSettings: !isFinanciero,
    canViewExperience: (permissions.settings.ui || isSuperAdmin || isAdmin) && !isFinanciero,
    isSuperAdmin,
    isFinanciero,
    isResolvingRole: isLoadingRole,
  };
};
