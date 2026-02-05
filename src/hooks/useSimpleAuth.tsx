
import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export interface SimpleAuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
}

export const useSimpleAuth = (): SimpleAuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Función para obtener el rol del usuario
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ SimpleAuth: Error obteniendo rol:', error);
        return null;
      }

      return data?.role || 'vendedor';
    } catch (error) {
      console.error('❌ SimpleAuth: Error inesperado obteniendo rol:', error);
      return null;
    }
  }, []);

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
      setUserRole(null);
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
      setUserRole(null);
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
          
          // Obtener perfil y rol si hay usuario
          const [userProfile, role] = await Promise.all([
            fetchProfile(currentSession.user.id),
            fetchUserRole(currentSession.user.id)
          ]);
          
          if (mounted) {
            setProfile(userProfile);
            setUserRole(role);
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
  }, [fetchProfile, fetchUserRole]);

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
          setUserRole(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          setLoading(true);
          const [userProfile, role] = await Promise.all([
            fetchProfile(newSession.user.id),
            fetchUserRole(newSession.user.id)
          ]);
          setProfile(userProfile);
          setUserRole(role);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          if (!profile) {
            const [userProfile, role] = await Promise.all([
              fetchProfile(newSession.user.id),
              fetchUserRole(newSession.user.id)
            ]);
            setProfile(userProfile);
            setUserRole(role);
          }
        }
      }
    );

    return () => {
      console.log('🔇 SimpleAuth: Desconectando listener');
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchUserRole, profile]);

  return {
    user,
    profile,
    session,
    loading,
    userRole,
    signOut,
  };
};
