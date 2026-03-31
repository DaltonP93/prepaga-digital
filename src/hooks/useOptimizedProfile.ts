
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { useCallback } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const useOptimizedProfile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized profile query with better caching
  const { 
    data: profile, 
    isLoading, 
    error,
    refetch: refetchProfile 
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(name, email, phone, address)
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching optimized profile:', error);
        throw error;
      }
      
      return data;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Optimized update mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error updating optimized profile:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Optimized profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil.",
        variant: "destructive",
      });
    },
  });

  // Optimized refresh function
  const refreshProfile = useCallback(async () => {
    await refetchProfile();
  }, [refetchProfile]);

  // Force refresh with cache invalidation
  const forceRefreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    await refetchProfile();
  }, [queryClient, refetchProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
    refreshProfile,
    forceRefreshProfile,
  };
};
