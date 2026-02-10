
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];
type ClientCreatePayload = Omit<ClientInsert, 'company_id'> & { company_id?: string };

const resolveCompanyId = async (profileCompanyId?: string | null, userId?: string): Promise<string | null> => {
  if (profileCompanyId) return profileCompanyId;
  if (!userId) return null;

  // First fallback: read company_id from profile directly
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profileError && profileData?.company_id) {
    return profileData.company_id;
  }

  // Second fallback: RPC (if available in this environment)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_company_id', { _user_id: userId });
  if (rpcError) {
    console.warn('No se pudo resolver company_id por RPC:', rpcError.message);
    return null;
  }

  return rpcData || null;
};

export const useClients = () => {
  const { profile, user } = useSimpleAuthContext();

  return useQuery({
    queryKey: ['clients', profile?.company_id, user?.id],
    queryFn: async () => {
      const companyId = await resolveCompanyId(profile?.company_id, user?.id);
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      // If we can resolve company_id, keep explicit filter.
      // If not, let RLS determine visible rows instead of returning an empty list.
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateClient = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, user } = useSimpleAuthContext();

  return useMutation({
    mutationFn: async (clientData: ClientCreatePayload) => {
      const companyId = clientData.company_id || await resolveCompanyId(profile?.company_id, user?.id);
      if (!companyId) {
        throw new Error('No se pudo identificar la empresa del usuario. Cierra sesión e inicia nuevamente.');
      }

      const payload: ClientInsert = {
        ...clientData,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido creado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el cliente.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateClient = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, user } = useSimpleAuthContext();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const companyId = await resolveCompanyId(profile?.company_id, user?.id);
      if (!companyId) {
        throw new Error('No se pudo identificar la empresa del usuario.');
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Cliente actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el cliente.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteClient = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, user } = useSimpleAuthContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const companyId = await resolveCompanyId(profile?.company_id, user?.id);
      if (!companyId) {
        throw new Error('No se pudo identificar la empresa del usuario.');
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    },
  });
};
