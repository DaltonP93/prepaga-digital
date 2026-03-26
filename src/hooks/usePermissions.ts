
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
        .from('available_permissions')
        .select('id, permission_key, permission_name, description, category, is_active')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('permission_name', { ascending: true });

      if (error) throw error;
      return (data || []) as Permission[];
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

      const { data, error } = await supabase.rpc('get_user_permissions', { user_id: userId });
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

      const { error: deleteError } = await supabase
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

      const { error: insertError } = await supabase
        .from('user_permissions')
        .insert(rows as any);

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
