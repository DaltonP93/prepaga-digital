
import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forceRefreshProfile: () => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastActivity: Date;
  loadingStage: 'initializing' | 'loading_profile' | 'retrying' | 'ready' | 'error';
  loadingProgress: number;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [lastActivity] = useState(new Date());
  const [loadingStage, setLoadingStage] = useState<'initializing' | 'loading_profile' | 'retrying' | 'ready' | 'error'>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
  }, [user, fetchProfile]);

  const forceRefreshProfile = useCallback(async () => {
    if (!user) return;
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
      setLoadingStage('ready');
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        setLoadingStage('initializing');
        setLoadingProgress(25);
        
        // Add timeout to prevent indefinite loading
        const authTimeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Auth initialization timeout')), 10000);
        });

        const authInitialization = (async () => {
          // Get current session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setLoadingProgress(50);
          
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoadingProgress(75);
            
            // Load profile if user exists
            if (currentSession?.user) {
              setLoadingStage('loading_profile');
              
              // Add timeout for profile loading
              const profileTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Profile loading timeout')), 5000);
              });
              
              try {
                const userProfile = await Promise.race([
                  fetchProfile(currentSession.user.id),
                  profileTimeout
                ]) as Profile | null;
                
                if (mounted) {
                  setProfile(userProfile);
                }
              } catch (profileError) {
                if (mounted) {
                  setProfile(null);
                }
              }
            } else {
            }
            
            setLoadingProgress(100);
            setLoadingStage('ready');
            setLoading(false);
          }
        })();

        await Promise.race([authInitialization, authTimeout]);
        
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setLoadingStage('error');
          setLoading(false);
          setLoadingProgress(0);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchProfile]);

  // Listen for auth changes
  useEffect(() => {
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoadingStage('ready');
          setLoading(false);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          setLoadingStage('loading_profile');
          setLoading(true);
          
          try {
            const userProfile = await Promise.race([
              fetchProfile(newSession.user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile timeout')), 5000)
              )
            ]) as Profile | null;
            
            setProfile(userProfile);
          } catch (error) {
            setProfile(null);
          }
          
          setLoadingStage('ready');
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshProfile,
    forceRefreshProfile,
    connectionStatus,
    lastActivity,
    loadingStage,
    loadingProgress,
  };
};
