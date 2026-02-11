
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ProfileWithRole } from '@/types/auth';
import type { AppRole } from '@/types/roles';

export interface SimpleAuthContextType {
  user: User | null;
  profile: ProfileWithRole | null;
  loading: boolean;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = [
  'super_admin',
  'admin',
  'supervisor',
  'auditor',
  'gestor',
  'vendedor',
];

const resolveHighestRole = (roles: string[]): AppRole => {
  const normalized = roles.filter((role): role is AppRole =>
    ROLE_PRIORITY.includes(role as AppRole)
  );

  for (const role of ROLE_PRIORITY) {
    if (normalized.includes(role)) return role;
  }

  return 'vendedor';
};

const fetchProfileData = async (userId: string): Promise<{ profile: ProfileWithRole | null; role: string | null }> => {
  try {
    const [profileResult, roleResult, rpcRoleResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.rpc('get_user_role', { _user_id: userId }),
    ]);

    if (profileResult.error) {
      console.error('❌ Error fetching profile:', profileResult.error);
      return { profile: null, role: null };
    }

    const roleList = (roleResult.data || [])
      .map((entry: any) => entry?.role)
      .filter((role: any): role is string => typeof role === 'string' && role.length > 0);

    const rpcRole =
      typeof rpcRoleResult.data === 'string' && rpcRoleResult.data.length > 0
        ? (rpcRoleResult.data as AppRole)
        : null;

    const legacyProfileRole =
      typeof (profileResult.data as any)?.role === 'string' && (profileResult.data as any)?.role.length > 0
        ? ((profileResult.data as any).role as AppRole)
        : null;

    const role = roleList.length > 0
      ? resolveHighestRole(roleList)
      : rpcRole || legacyProfileRole || null;

    const profile: ProfileWithRole | null = profileResult.data
      ? { ...profileResult.data, role: role as ProfileWithRole['role'] }
      : null;

    return { profile, role: role || 'vendedor' };
  } catch (error) {
    console.error('❌ Error fetching profile data:', error);
    return { profile: null, role: null };
  }
};

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Set up listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        console.log('🔄 Auth state change:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Fire and forget - don't block UI
          fetchProfileData(session.user.id).then(({ profile: p, role }) => {
            if (!isMounted) return;
            setProfile(p);
            setUserRole(role);
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setUserRole(null);
          localStorage.clear();
          sessionStorage.clear();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    // 2. INITIAL load (controls loading state)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          const { profile: p, role } = await fetchProfileData(session.user.id);
          if (!isMounted) return;
          setProfile(p);
          setUserRole(role);
        }
      } catch (error) {
        console.error('❌ Auth init error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Por favor confirma tu email antes de iniciar sesión.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <SimpleAuthContext.Provider value={{ user, profile, loading, userRole, signIn, signOut }}>
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
