
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  permission_key: string;
  permission_name: string;
  description?: string;
  category: string;
  is_active: boolean;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_key: string;
  granted: boolean;
  granted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermissionWithDetails extends UserPermission {
  permission_name: string;
  description?: string;
  category: string;
}

const FALLBACK_PERMISSIONS: Permission[] = [
  { id: 'f1', permission_key: 'dashboard.view', permission_name: 'Ver Dashboard', description: 'Acceso al dashboard principal', category: 'dashboard', is_active: true },
  { id: 'f2', permission_key: 'sales.view', permission_name: 'Ver Ventas', description: 'Acceso a la lista de ventas', category: 'sales', is_active: true },
  { id: 'f3', permission_key: 'sales.create', permission_name: 'Crear Ventas', description: 'Crear nuevas ventas', category: 'sales', is_active: true },
  { id: 'f4', permission_key: 'sales.edit', permission_name: 'Editar Ventas', description: 'Modificar ventas existentes', category: 'sales', is_active: true },
  { id: 'f5', permission_key: 'sales.delete', permission_name: 'Eliminar Ventas', description: 'Eliminar ventas', category: 'sales', is_active: true },
  { id: 'f6', permission_key: 'clients.view', permission_name: 'Ver Clientes', description: 'Acceso a la lista de clientes', category: 'clients', is_active: true },
  { id: 'f7', permission_key: 'clients.create', permission_name: 'Crear Clientes', description: 'Crear nuevos clientes', category: 'clients', is_active: true },
  { id: 'f8', permission_key: 'clients.edit', permission_name: 'Editar Clientes', description: 'Modificar clientes existentes', category: 'clients', is_active: true },
  { id: 'f9', permission_key: 'plans.view', permission_name: 'Ver Planes', description: 'Acceso a la lista de planes', category: 'plans', is_active: true },
  { id: 'f10', permission_key: 'plans.create', permission_name: 'Crear Planes', description: 'Crear nuevos planes', category: 'plans', is_active: true },
  { id: 'f11', permission_key: 'plans.edit', permission_name: 'Editar Planes', description: 'Modificar planes existentes', category: 'plans', is_active: true },
  { id: 'f12', permission_key: 'documents.view', permission_name: 'Ver Documentos', description: 'Acceso a documentos', category: 'documents', is_active: true },
  { id: 'f13', permission_key: 'templates.view', permission_name: 'Ver Templates', description: 'Acceso a templates', category: 'templates', is_active: true },
  { id: 'f14', permission_key: 'templates.create', permission_name: 'Crear Templates', description: 'Crear nuevos templates', category: 'templates', is_active: true },
  { id: 'f15', permission_key: 'templates.edit', permission_name: 'Editar Templates', description: 'Modificar templates existentes', category: 'templates', is_active: true },
  { id: 'f16', permission_key: 'analytics.view', permission_name: 'Ver Analytics', description: 'Acceso a analytics', category: 'analytics', is_active: true },
  { id: 'f17', permission_key: 'users.view', permission_name: 'Ver Usuarios', description: 'Acceso a la gestión de usuarios', category: 'admin', is_active: true },
  { id: 'f18', permission_key: 'users.create', permission_name: 'Crear Usuarios', description: 'Crear nuevos usuarios', category: 'admin', is_active: true },
  { id: 'f19', permission_key: 'users.edit', permission_name: 'Editar Usuarios', description: 'Modificar usuarios existentes', category: 'admin', is_active: true },
  { id: 'f20', permission_key: 'companies.view', permission_name: 'Ver Empresas', description: 'Acceso a la gestión de empresas', category: 'admin', is_active: true },
  { id: 'f21', permission_key: 'companies.create', permission_name: 'Crear Empresas', description: 'Crear nuevas empresas', category: 'admin', is_active: true },
  { id: 'f22', permission_key: 'companies.edit', permission_name: 'Editar Empresas', description: 'Modificar empresas existentes', category: 'admin', is_active: true },
  { id: 'f23', permission_key: 'audit.view', permission_name: 'Ver Auditoría', description: 'Acceso a logs de auditoría', category: 'admin', is_active: true },
  { id: 'f24', permission_key: 'experience.view', permission_name: 'Ver Configuración', description: 'Acceso a configuración del sistema', category: 'admin', is_active: true },
];

export const useAvailablePermissions = () => {
  return useQuery({
    queryKey: ['available-permissions'],
    queryFn: async (): Promise<Permission[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('available_permissions')
          .select('id, permission_key, permission_name, description, category, is_active')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('permission_name', { ascending: true });

        if (error || !data || data.length === 0) return FALLBACK_PERMISSIONS;
        return data as Permission[];
      } catch {
        return FALLBACK_PERMISSIONS;
      }
    },
    staleTime: 0,
  });
};

export const useUserPermissions = (userId?: string) => {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      // Return default permissions for now
      return [
        { permission_key: 'dashboard.view', granted: true },
        { permission_key: 'sales.view', granted: true },
      ];
    },
    enabled: !!userId,
  });
};

export const useUserPermissionsWithDetails = (userId?: string) => {
  return useQuery({
    queryKey: ['user-permissions-details', userId],
    queryFn: async (): Promise<UserPermissionWithDetails[]> => {
      if (!userId) return [];

      const { data, error } = await (supabase.rpc as any)('get_user_permissions', { _user_id: userId });
      if (error) throw error;

      return ((data as any[]) || []).map((row: any, index) => ({
        id: row.id || `${userId}-${row.permission_key}-${index}`,
        user_id: userId,
        permission_key: row.permission_key,
        granted: !!row.granted,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
        permission_name: row.permission_name,
        description: row.description,
        category: row.category || 'general',
      }));
    },
    enabled: !!userId,
  });
};

export const useUpdateUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissions
    }: {
      userId: string;
      permissions: { permission_key: string; granted: boolean }[];
    }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      const grantedBy = currentUser.user?.id || null;

      const { error: deleteError } = await (supabase as any)
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (permissions.length === 0) {
        return true;
      }

      const rows = permissions.map((permission) => ({
        user_id: userId,
        permission_key: permission.permission_key,
        granted: permission.granted,
        granted_by: grantedBy,
      }));

      const { error: insertError } = await (supabase as any)
        .from('user_permissions')
        .insert(rows);

      if (insertError) throw insertError;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions-details', variables.userId] });
      toast.success('Permisos actualizados exitosamente');
    },
    onError: (error: any) => {
      toast.error('Error al actualizar permisos: ' + error.message);
    },
  });
};

export const useHasPermission = (permissionKey: string) => {
  return useQuery({
    queryKey: ['has-permission', permissionKey],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // For now, return true for basic permissions
      return true;
    },
  });
};
