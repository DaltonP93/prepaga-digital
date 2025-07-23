
import React, { createContext, useContext } from 'react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
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
  const auth = useSimpleAuth();
  
  console.log('🔒 SimpleAuthProvider: Estado actual', {
    user: !!auth.user,
    profile: !!auth.profile,
    loading: auth.loading,
    email: auth.user?.email
  });
  
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 SimpleAuthProvider: Iniciando login...');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ SimpleAuthProvider: Error en login:', error);
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor confirma tu email antes de iniciar sesión.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Demasiados intentos. Espera unos minutos antes de volver a intentar.');
        }
        throw error;
      }
      
      console.log('✅ SimpleAuthProvider: Login exitoso');
      
    } catch (error) {
      console.error('❌ SimpleAuthProvider: Error:', error);
      throw error;
    }
  };

  const contextValue: SimpleAuthContextType = {
    ...auth,
    signIn,
  };

  return <SimpleAuthContext.Provider value={contextValue}>{children}</SimpleAuthContext.Provider>;
};

export const useSimpleAuthContext = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuthContext must be used within a SimpleAuthProvider');
  }
  return context;
};
