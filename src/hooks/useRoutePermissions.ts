
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRoutePermissions = () => {
  const { user, userRole } = useSimpleAuthContext();

  const { data: roleFlags, isLoading: isResolvingRole } = useQuery({
    queryKey: ['route-role-flags', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id) {
        return { isSuperAdmin: false, isAdmin: false, isSupervisor: false, isAuditor: false };
      }

      const [superAdminRes, adminRes, supervisorRes, auditorRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'supervisor' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'auditor' }),
      ]);

      return {
        isSuperAdmin: Boolean(superAdminRes.data),
        isAdmin: Boolean(adminRes.data),
        isSupervisor: Boolean(supervisorRes.data),
        isAuditor: Boolean(auditorRes.data),
      };
    },
  });

  const isSuperAdmin = roleFlags?.isSuperAdmin || userRole === 'super_admin';
  const isAdmin = roleFlags?.isAdmin || userRole === 'admin';
  const isSupervisor = roleFlags?.isSupervisor || userRole === 'supervisor';
  const isAuditor = roleFlags?.isAuditor || userRole === 'auditor';

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
    canViewAudit: isSuperAdmin || isAdmin || isSupervisor || isAuditor || isResolvingRole,
    canViewSettings: true,
    canViewExperience: isSuperAdmin || isAdmin,
    isSuperAdmin,
    isResolvingRole,
  };
};
