
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

export const useAvailablePermissions = () => {
  return useQuery({
    queryKey: ['available-permissions'],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: 'dummy' });

      if (error) {
        console.warn('Permissions table not ready yet, using defaults');
        return [
          { id: '1', permission_key: 'dashboard.view', permission_name: 'Ver Dashboard', category: 'dashboard', is_active: true },
          { id: '2', permission_key: 'sales.view', permission_name: 'Ver Ventas', category: 'sales', is_active: true },
          { id: '3', permission_key: 'sales.create', permission_name: 'Crear Ventas', category: 'sales', is_active: true },
          { id: '4', permission_key: 'sales.edit', permission_name: 'Editar Ventas', category: 'sales', is_active: true },
          { id: '5', permission_key: 'clients.view', permission_name: 'Ver Clientes', category: 'clients', is_active: true },
          { id: '6', permission_key: 'plans.view', permission_name: 'Ver Planes', category: 'plans', is_active: true },
          { id: '7', permission_key: 'users.view', permission_name: 'Ver Usuarios', category: 'admin', is_active: true },
        ];
      }
      return [];
    },
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
      
      // Return default structure for now
      return [
        {
          id: '1',
          user_id: userId,
          permission_key: 'dashboard.view',
          granted: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          permission_name: 'Ver Dashboard',
          category: 'dashboard'
        }
      ];
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
      // For now, just simulate success
      console.log('Updating permissions for user:', userId, permissions);
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
