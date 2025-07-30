
import { useHasPermission } from './usePermissions';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

export const useRoutePermissions = () => {
  const { profile } = useSimpleAuthContext();
  
  const { data: canViewDashboard } = useHasPermission('dashboard.view');
  const { data: canViewSales } = useHasPermission('sales.view');
  const { data: canCreateSales } = useHasPermission('sales.create');
  const { data: canEditSales } = useHasPermission('sales.edit');
  const { data: canDeleteSales } = useHasPermission('sales.delete');
  const { data: canViewClients } = useHasPermission('clients.view');
  const { data: canCreateClients } = useHasPermission('clients.create');
  const { data: canViewPlans } = useHasPermission('plans.view');
  const { data: canViewDocuments } = useHasPermission('documents.view');
  const { data: canViewTemplates } = useHasPermission('templates.view');
  const { data: canViewAnalytics } = useHasPermission('analytics.view');
  const { data: canViewUsers } = useHasPermission('users.view');
  const { data: canViewCompanies } = useHasPermission('companies.view');
  const { data: canViewAudit } = useHasPermission('audit.view');
  const { data: canViewExperience } = useHasPermission('experience.view');

  // Super admins tienen acceso a todo
  const isSuperAdmin = profile?.role === 'super_admin';

  return {
    canViewDashboard: isSuperAdmin || canViewDashboard,
    canViewSales: isSuperAdmin || canViewSales,
    canCreateSales: isSuperAdmin || canCreateSales,
    canEditSales: isSuperAdmin || canEditSales,
    canDeleteSales: isSuperAdmin || canDeleteSales,
    canViewClients: isSuperAdmin || canViewClients,
    canCreateClients: isSuperAdmin || canCreateClients,
    canViewPlans: isSuperAdmin || canViewPlans,
    canViewDocuments: isSuperAdmin || canViewDocuments,
    canViewTemplates: isSuperAdmin || canViewTemplates,
    canViewAnalytics: isSuperAdmin || canViewAnalytics,
    canViewUsers: isSuperAdmin || canViewUsers,
    canViewCompanies: isSuperAdmin || canViewCompanies,
    canViewAudit: isSuperAdmin || canViewAudit,
    canViewExperience: isSuperAdmin || canViewExperience,
    isSuperAdmin
  };
};
