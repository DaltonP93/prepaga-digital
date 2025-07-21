
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface UserWithCompany extends Profile {
  companies?: {
    id: string;
    name: string;
  } | null;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserWithCompany[]> => {
      console.log('Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:company_id(id, name)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      console.log('Users fetched successfully:', data);
      return data || [];
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProfileUpdate & { id: string }) => {
      console.log('Updating user:', id, updates);
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }
      
      console.log('User updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar usuario: ' + error.message);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deactivating user:', id);
      const { error } = await supabase
        .from('profiles')
        .update({ active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating user:', error);
        throw error;
      }
      
      console.log('User deactivated successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario desactivado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deactivating user:', error);
      toast.error('Error al desactivar usuario: ' + error.message);
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      role: Database['public']['Enums']['user_role'];
      company_id?: string;
    }) => {
      console.log('Creating user via edge function:', userData);
      
      // Validate required fields
      if (!userData.email || !userData.password || !userData.first_name || !userData.last_name) {
        throw new Error('Todos los campos obligatorios deben ser completados');
      }
      
      if (!userData.company_id) {
        throw new Error('Debe seleccionar una empresa');
      }
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Error al crear usuario');
      }

      if (!data || !data.success) {
        console.error('Edge function failed:', data);
        throw new Error(data?.error || 'Error creating user');
      }

      console.log('User created successfully:', data.user);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating user:', error);
      toast.error('Error al crear usuario: ' + error.message);
    },
  });
};
