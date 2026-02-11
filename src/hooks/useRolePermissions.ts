import { useMemo } from 'react';
import { type RolePermissions } from '@/types/roles';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

export const useRolePermissions = () => {
  const { role: currentRole, roleLabel, roleColor, permissions, isLoadingRole } = useEffectiveRole();

  /**
   * Verifica si el usuario tiene permiso para una acción específica en un recurso
   */
  const can = useMemo(() => {
    return <T extends keyof RolePermissions>(
      resource: T,
      action: keyof RolePermissions[T]
    ): boolean => {
      const resourcePermissions = permissions[resource];
      if (!resourcePermissions) return false;
      return (resourcePermissions as Record<string, boolean>)[action as string] === true;
    };
  }, [permissions]);

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   */
  const canAny = useMemo(() => {
    return (checks: Array<{ resource: keyof RolePermissions; action: string }>): boolean => {
      return checks.some(({ resource, action }) => {
        const resourcePermissions = permissions[resource];
        if (!resourcePermissions) return false;
        return (resourcePermissions as Record<string, boolean>)[action] === true;
      });
    };
  }, [permissions]);

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  const canAll = useMemo(() => {
    return (checks: Array<{ resource: keyof RolePermissions; action: string }>): boolean => {
      return checks.every(({ resource, action }) => {
        const resourcePermissions = permissions[resource];
        if (!resourcePermissions) return false;
        return (resourcePermissions as Record<string, boolean>)[action] === true;
      });
    };
  }, [permissions]);

  /**
   * Verifica si el usuario es admin o super_admin
   */
  const isAdmin = useMemo(() => {
    return currentRole === 'admin' || currentRole === 'super_admin';
  }, [currentRole]);

  /**
   * Verifica si el usuario es super_admin
   */
  const isSuperAdmin = useMemo(() => {
    return currentRole === 'super_admin';
  }, [currentRole]);

  /**
   * Verifica si el usuario puede gestionar un recurso (CRUD completo)
   */
  const canManage = useMemo(() => {
    return (resource: keyof RolePermissions): boolean => {
      const resourcePermissions = permissions[resource] as Record<string, boolean>;
      return (
        resourcePermissions?.create === true &&
        resourcePermissions?.read === true &&
        resourcePermissions?.update === true &&
        resourcePermissions?.delete === true
      );
    };
  }, [permissions]);

  return {
    role: currentRole,
    roleLabel,
    roleColor,
    permissions,
    can,
    canAny,
    canAll,
    canManage,
    isAdmin,
    isSuperAdmin,
    isLoadingRole,
  };
};

export default useRolePermissions;
