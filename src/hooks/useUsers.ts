
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import type { AppRole } from '@/types/roles';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface CreateUserParams {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'auditor' | 'gestor' | 'vendedor' | 'financiero';
  company_id?: string;
}

export interface UserWithRole extends Profile {
  companies: { name: string } | null;
  user_roles: { role: string }[] | null;
}

const ROLE_PRIORITY: AppRole[] = [
  'super_admin',
  'admin',
  'supervisor',
  'auditor',
  'financiero',
  'gestor',
  'vendedor',
];

const resolveHighestRole = (roles: string[]): AppRole => {
  const normalized = roles.filter((role): role is AppRole =>
    ROLE_PRIORITY.includes(role as AppRole)
  );

  for (const role of ROLE_PRIORITY) {
    if (normalized.includes(role)) return role;
  }

  return 'vendedor';
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:company_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles separately since there's no direct FK
      const userIds = profiles.map(p => p.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const groupedRoles = new Map<string, string[]>();
      roles?.forEach((r) => {
        const current = groupedRoles.get(r.user_id) || [];
        current.push(r.role);
        groupedRoles.set(r.user_id, current);
      });

      return profiles.map(p => ({
        ...p,
        user_roles: groupedRoles.has(p.id)
          ? [{ role: resolveHighestRole(groupedRoles.get(p.id) || []) }]
          : null,
      })) as UserWithRole[];
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserParams) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: userData.email,
          password: userData.password,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          role: userData.role,
          company_id: userData.company_id,
        },
      });

      if (error) {
        const context = (error as any)?.context;
        let errorMsg = 'Error al crear usuario';
        if (context?.body) {
          try {
            const body = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;
            errorMsg = body?.error || body?.details || errorMsg;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Error al crear usuario');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role, ...profileUpdates }: ProfileUpdate & { id: string; role?: string }) => {
      const { data: actorData } = await supabase.auth.getUser();
      const actorId = actorData.user?.id;
      if (!actorId) throw new Error('Sesión inválida. Inicia sesión nuevamente.');

      const [actorSuperAdminRes, actorAdminRes, targetRolesRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: actorId, _role: 'super_admin' }),
        supabase.rpc('has_role', { _user_id: actorId, _role: 'admin' }),
        supabase.from('user_roles').select('role').eq('user_id', id),
      ]);

      const actorIsSuperAdmin = Boolean(actorSuperAdminRes.data);
      const actorIsAdmin = Boolean(actorAdminRes.data);
      const actorCanManageRoles = actorIsSuperAdmin || actorIsAdmin;

      const targetCurrentRoles = (targetRolesRes.data || [])
        .map((entry: any) => entry?.role)
        .filter((value: any): value is string => typeof value === 'string' && value.length > 0);
      const targetCurrentRole = targetCurrentRoles.length > 0 ? resolveHighestRole(targetCurrentRoles) : 'vendedor';

      // Restricciones RBAC para modificaciones de rol
      if (role) {
        if (!actorCanManageRoles) {
          throw new Error('No tienes permisos para modificar roles de usuario.');
        }
        if (targetCurrentRole === 'super_admin' && !actorIsSuperAdmin) {
          throw new Error('Solo un super admin puede modificar usuarios con rol super admin.');
        }
        if (role === 'super_admin' && !actorIsSuperAdmin) {
          throw new Error('Solo un super admin puede asignar el rol super admin.');
        }
      }

      // Update profile fields (exclude role)
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id);

      if (profileError) throw profileError;

      // Update role in user_roles table if provided
      if (role) {
        // Delete all existing roles for this user first
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id);

        if (deleteError) throw deleteError;

        // Insert the new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: id, role: role as any });

        if (insertError) throw insertError;

        // Audit log for RBAC changes (best effort)
        const targetCompanyId = (profileUpdates.company_id as string | null | undefined) ?? null;
        const action = targetCurrentRole === role ? 'USER_ROLE_RECONFIRMED' : 'USER_ROLE_CHANGED';
        await supabase.from('audit_logs').insert({
          action,
          entity_type: 'user_roles',
          entity_id: id,
          old_values: { role: targetCurrentRole },
          new_values: { role },
          user_id: actorId,
          company_id: targetCompanyId,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        } as any);
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating user:', error);
      toast.error(error.message || 'No se pudo actualizar el usuario');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario desactivado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deactivating user:', error);
      toast.error(error.message || 'No se pudo desactivar el usuario');
    },
  });
};

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          action: 'reset_password',
          user_id: userId,
          new_password: newPassword,
        },
      });

      if (error) {
        const context = (error as any)?.context;
        let errorMsg = 'Error al cambiar contraseña';
        if (context?.body) {
          try {
            const body = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;
            errorMsg = body?.error || body?.details || errorMsg;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al cambiar contraseña');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Error al cambiar contraseña');
    },
  });
};

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
};
