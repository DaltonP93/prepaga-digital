
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ProfileWithRole } from '@/types/auth';

interface SimpleAuthContextType {
  user: User | null;
  profile: ProfileWithRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🔐 SimpleAuthProvider: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email 
  });

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('🚀 SimpleAuthProvider: Inicializando auth...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ SimpleAuthProvider: Error getting session:', error);
        } else if (session?.user && mounted) {
          console.log('✅ SimpleAuthProvider: Sesión encontrada');
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('ℹ️ SimpleAuthProvider: No hay sesión activa');
        }
      } catch (error) {
        console.error('❌ SimpleAuthProvider: Error initializing auth:', error);
      } finally {
        if (mounted) {
          console.log('✅ SimpleAuthProvider: Inicialización completa, loading = false');
          setLoading(false);
        }
      }
    };

    const fetchProfile = async (userId: string) => {
      try {
        console.log('👤 SimpleAuthProvider: Obteniendo perfil para:', userId);
        
        // Get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.error('❌ SimpleAuthProvider: Error fetching profile:', profileError);
          return;
        }

        // Get role from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleError) {
          console.error('❌ SimpleAuthProvider: Error fetching role:', roleError);
        }

        if (profileData && mounted) {
          const profileWithRole: ProfileWithRole = {
            ...profileData,
            role: roleData?.role || null
          };
          console.log('✅ SimpleAuthProvider: Perfil obtenido:', profileWithRole);
          setProfile(profileWithRole);
        }
      } catch (error) {
        console.error('❌ SimpleAuthProvider: Error fetching profile:', error);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 SimpleAuthProvider: Auth state change:', event, { 
          hasSession: !!session,
          hasUser: !!session?.user 
        });

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ SimpleAuthProvider: Usuario logueado');
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 SimpleAuthProvider: Usuario deslogueado');
          setUser(null);
          setProfile(null);
          // Limpiar storage
          localStorage.clear();
          sessionStorage.clear();
        }
      }
    );

    return () => {
      console.log('🔇 SimpleAuthProvider: Cleanup');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 SimpleAuthProvider: Iniciando signIn para:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ SimpleAuthProvider: Error en signIn:', error);
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor confirma tu email antes de iniciar sesión.');
        }
        throw error;
      }
      
      console.log('✅ SimpleAuthProvider: SignIn exitoso');
    } catch (error) {
      console.error('❌ SimpleAuthProvider: Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 SimpleAuthProvider: Cerrando sesión...');
      
      // Limpiar storage primero
      localStorage.clear();
      sessionStorage.clear();
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      console.log('✅ SimpleAuthProvider: Sesión cerrada');
      
      // Redirigir
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ SimpleAuthProvider: Error signing out:', error);
      // Forzar redirect incluso si hay error
      window.location.href = '/login';
    }
  };

  const contextValue: SimpleAuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
  };

  return (
    <SimpleAuthContext.Provider value={contextValue}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuthContext = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuthContext must be used within a SimpleAuthProvider');
  }
  return context;
};
