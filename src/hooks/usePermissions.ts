
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
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('permission_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useUserPermissions = (userId?: string) => {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: userId });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

export const useUserPermissionsWithDetails = (userId?: string) => {
  return useQuery({
    queryKey: ['user-permissions-details', userId],
    queryFn: async (): Promise<UserPermissionWithDetails[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          available_permissions:permission_key (
            permission_name,
            description,
            category
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        permission_name: item.available_permissions?.permission_name || '',
        description: item.available_permissions?.description,
        category: item.available_permissions?.category || 'general'
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
      // Primero eliminar permisos existentes
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Insertar solo los permisos otorgados
      const permissionsToInsert = permissions
        .filter(p => p.granted)
        .map(p => ({
          user_id: userId,
          permission_key: p.permission_key,
          granted: true,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }
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

      const { data, error } = await supabase
        .rpc('user_has_permission', {
          user_id: user.user.id,
          permission_key: permissionKey
        });

      if (error) throw error;
      return data || false;
    },
  });
};
