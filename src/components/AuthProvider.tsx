
import React, { createContext, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionManager } from '@/hooks/useSessionManager';
import { User } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  forceRefreshProfile: () => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastActivity: Date;
  loadingStage: 'initializing' | 'loading_profile' | 'retrying' | 'ready' | 'error';
  loadingProgress: number;
  isConnected: boolean;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const { isConnected, updateActivity } = useSessionManager(5, 30);
  
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
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Demasiados intentos. Espera unos minutos antes de volver a intentar.');
        }
        throw error;
      }
      
      updateActivity();
      toast.success('¡Bienvenido! Has iniciado sesión correctamente.');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
        } else if (error.message.includes('Password should be')) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        } else if (error.message.includes('Invalid email')) {
          throw new Error('Por favor ingresa un email válido.');
        }
        throw error;
      }

      toast.success('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...auth,
    signIn,
    signUp,
    isConnected,
    updateActivity,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
