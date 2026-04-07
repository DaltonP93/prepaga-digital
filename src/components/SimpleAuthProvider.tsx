
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
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

const BRANDING_STORAGE_KEYS = [
  'samap_branding_favicon',
  'samap_branding_logo',
  'samap_branding_name',
  'samap_branding_login_background',
  'samap_branding_login_subtitle',
] as const;

const preserveBrandingStorage = () => {
  try {
    const preserved = BRANDING_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)] as const);
    localStorage.clear();
    for (const [key, value] of preserved) {
      if (value) localStorage.setItem(key, value);
    }
  } catch {
    // noop
  }
};

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.history.replaceState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
};

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
    const [profileResult, roleResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (profileResult.error) {
      console.error('❌ Error fetching profile:', profileResult.error);
      return { profile: null, role: null };
    }

    const roleList = (roleResult.data || [])
      .map((entry: any) => entry?.role)
      .filter((role: any): role is string => typeof role === 'string' && role.length > 0);

    const legacyProfileRole =
      typeof (profileResult.data as any)?.role === 'string' && (profileResult.data as any)?.role.length > 0
        ? ((profileResult.data as any).role as AppRole)
        : null;

    const role = roleList.length > 0
      ? resolveHighestRole(roleList)
      : legacyProfileRole || null;

    const profile: ProfileWithRole | null = profileResult.data
      ? { ...profileResult.data, role: role as ProfileWithRole['role'] }
      : null;

    return { profile, role: role || 'vendedor' };
  } catch (error) {
    console.error('❌ Error fetching profile data:', error);
    return { profile: null, role: null };
  }
};

const ensureActiveProfile = async (profile: ProfileWithRole | null) => {
  if (profile?.is_active === false) {
    preserveBrandingStorage();
    sessionStorage.clear();
    await supabase.auth.signOut();
    throw new Error('Usuario inactivo. Contacta al administrador para reactivar tu acceso.');
  }
};

const clearAuthState = (
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setProfile: React.Dispatch<React.SetStateAction<ProfileWithRole | null>>,
  setUserRole: React.Dispatch<React.SetStateAction<string | null>>
) => {
  setUser(null);
  setProfile(null);
  setUserRole(null);
};

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    // 1. Set up listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true);
          fetchProfileData(session.user.id)
            .then(async ({ profile: p, role }) => {
              if (!isMounted) return;
              if (p?.is_active === false) {
                preserveBrandingStorage();
                sessionStorage.clear();
                await supabase.auth.signOut();
                clearAuthState(setUser, setProfile, setUserRole);
                return;
              }
              setUser(session.user);
              setProfile(p);
              setUserRole(role);
            })
            .catch((error) => {
              console.error('❌ Error resolving SIGNED_IN profile:', error);
              if (!isMounted) return;
              clearAuthState(setUser, setProfile, setUserRole);
            })
            .finally(() => {
              if (isMounted) setLoading(false);
            });
        } else if (event === 'SIGNED_OUT') {
          clearAuthState(setUser, setProfile, setUserRole);
          queryClient.clear();
          preserveBrandingStorage();
          sessionStorage.clear();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    // 2. INITIAL load (controls loading state) with safety timeout
    const initializeAuth = async () => {
      // Safety timeout: if auth takes too long, unblock the UI
      const safetyTimeout = setTimeout(() => {
        if (isMounted && loading) {
          setLoading(false);
        }
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          const { profile: p, role } = await fetchProfileData(session.user.id);
          if (!isMounted) return;
          if (p?.is_active === false) {
            preserveBrandingStorage();
            sessionStorage.clear();
            await supabase.auth.signOut();
            clearAuthState(setUser, setProfile, setUserRole);
            return;
          }
          setUser(session.user);
          setProfile(p);
          setUserRole(role);
        }
      } catch (error) {
        console.error('❌ Auth init error:', error);
      } finally {
        clearTimeout(safetyTimeout);
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Por favor confirma tu email antes de iniciar sesión.');
      }
      throw error;
    }

    if (data.user) {
      const { profile } = await fetchProfileData(data.user.id);
      await ensureActiveProfile(profile);
    }
  };

  const signOut = async () => {
    try {
      preserveBrandingStorage();
      sessionStorage.clear();
      queryClient.clear();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      clearAuthState(setUser, setProfile, setUserRole);
      setLoading(false);
      redirectToLogin();
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
