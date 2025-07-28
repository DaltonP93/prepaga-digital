
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SimpleAuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data && mounted) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          // Limpiar storage
          localStorage.clear();
          sessionStorage.clear();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor confirma tu email antes de iniciar sesión.');
        }
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Limpiar storage primero
      localStorage.clear();
      sessionStorage.clear();
      
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // Redirigir
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
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
