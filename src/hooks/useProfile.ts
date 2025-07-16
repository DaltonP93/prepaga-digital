
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const useProfile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      console.log('🔍 Fetching profile in useProfile...');
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
        console.error('❌ Error fetching profile in useProfile:', error);
        throw error;
      }
      
      console.log('✅ Profile fetched in useProfile:', data);
      return data;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      console.log('🔄 Updating profile with data:', updates);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error updating profile:', error);
        throw error;
      }
      
      console.log('✅ Profile updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ Profile update success, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.setQueryData(['profile'], data);
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil.",
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
};
