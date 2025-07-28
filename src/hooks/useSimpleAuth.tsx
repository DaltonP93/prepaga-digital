
import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface SimpleAuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const useSimpleAuth = (): SimpleAuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Función optimizada para obtener perfil
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('👤 SimpleAuth: Obteniendo perfil para:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ SimpleAuth: Error obteniendo perfil:', error);
        return null;
      }

      console.log('✅ SimpleAuth: Perfil obtenido:', data);
      return data;
    } catch (error) {
      console.error('❌ SimpleAuth: Error inesperado:', error);
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 SimpleAuth: Cerrando sesión...');
      
      // Limpiar estados primero
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
      
      // Limpiar storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
    } catch (error) {
      console.error('❌ SimpleAuth: Error al cerrar sesión:', error);
      // Asegurar que los estados se limpien incluso si hay error
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
    }
  }, []);

  // Inicialización optimizada
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('🚀 SimpleAuth: Iniciando...');
        
        // Obtener sesión actual
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (currentSession) {
          console.log('✅ SimpleAuth: Sesión encontrada');
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Obtener perfil si hay usuario
          const userProfile = await fetchProfile(currentSession.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          console.log('ℹ️ SimpleAuth: No hay sesión activa');
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ SimpleAuth: Error en inicialización:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // Listener de cambios de autenticación optimizado
  useEffect(() => {
    console.log('👂 SimpleAuth: Configurando listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔄 SimpleAuth: Cambio de estado:', event, { 
          hasSession: !!newSession,
          userId: newSession?.user?.id 
        });

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          setLoading(true);
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          if (!profile) {
            const userProfile = await fetchProfile(newSession.user.id);
            setProfile(userProfile);
          }
        }
      }
    );

    return () => {
      console.log('🔇 SimpleAuth: Desconectando listener');
      subscription.unsubscribe();
    };
  }, [fetchProfile, profile]);

  return {
    user,
    profile,
    session,
    loading,
    signOut,
  };
};
