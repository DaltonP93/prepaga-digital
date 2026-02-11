import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { ROLE_PERMISSIONS, ROLE_LABELS, ROLE_COLORS, type AppRole } from '@/types/roles';

const ROLE_PRIORITY: AppRole[] = [
  'super_admin',
  'admin',
  'supervisor',
  'auditor',
  'financiero',
  'gestor',
  'vendedor',
];

export const useEffectiveRole = () => {
  const { user, userRole, profile } = useSimpleAuthContext();

  const { data: roleFlags, isLoading: isResolvingRole } = useQuery({
    queryKey: ['effective-role-flags', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id) {
        return {
          super_admin: false,
          admin: false,
          supervisor: false,
          auditor: false,
          financiero: false,
          gestor: false,
          vendedor: false,
        };
      }

      const [superAdminRes, adminRes, supervisorRes, auditorRes, financieroRes, gestorRes, vendedorRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'supervisor' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'auditor' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'financiero' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'gestor' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'vendedor' }),
      ]);

      return {
        super_admin: Boolean(superAdminRes.data),
        admin: Boolean(adminRes.data),
        supervisor: Boolean(supervisorRes.data),
        auditor: Boolean(auditorRes.data),
        financiero: Boolean(financieroRes.data),
        gestor: Boolean(gestorRes.data),
        vendedor: Boolean(vendedorRes.data),
      };
    },
  });

  const effectiveRole = useMemo<AppRole>(() => {
    for (const role of ROLE_PRIORITY) {
      if (roleFlags?.[role]) return role;
    }

    if (userRole && userRole in ROLE_PERMISSIONS) {
      return userRole as AppRole;
    }

    if (profile?.role && profile.role in ROLE_PERMISSIONS) {
      return profile.role as AppRole;
    }

    return 'vendedor';
  }, [roleFlags, userRole, profile?.role]);

  const permissions = ROLE_PERMISSIONS[effectiveRole];

  return {
    role: effectiveRole,
    roleLabel: ROLE_LABELS[effectiveRole],
    roleColor: ROLE_COLORS[effectiveRole],
    permissions,
    isLoadingRole: isResolvingRole,
    roleFlags,
  };
};

