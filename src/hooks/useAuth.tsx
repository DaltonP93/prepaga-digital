
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
      console.log('🔍 Fetching profile for user:', userId);
      console.log('📊 Supabase client status:', { 
        hasClient: !!supabase,
        url: supabase?.supabaseUrl
      });
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('📋 Profile query result:', { 
        data: data ? 'Profile found' : 'No profile', 
        error: error ? error.message : 'No error',
        userId 
      });

      if (error) {
        console.error('❌ Error fetching profile:', error);
        setLoadingStage('error');
        return null;
      }

      console.log('✅ Profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      setLoadingStage('error');
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    console.log('🔄 Refreshing profile...');
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
  }, [user, fetchProfile]);

  const forceRefreshProfile = useCallback(async () => {
    if (!user) return;
    console.log('🔄 Force refreshing profile...');
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      console.log('🔓 Signing out...');
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

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        setLoadingStage('initializing');
        setLoadingProgress(25);
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setLoadingProgress(50);
        
        console.log('📊 Current session:', { 
          hasSession: !!currentSession, 
          hasUser: !!currentSession?.user,
          userId: currentSession?.user?.id,
          isExpired: currentSession ? new Date(currentSession.expires_at! * 1000) < new Date() : 'N/A'
        });
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoadingProgress(75);
          
          // Load profile if user exists
          if (currentSession?.user) {
            console.log('👤 Loading profile for user:', currentSession.user.id);
            setLoadingStage('loading_profile');
            const userProfile = await fetchProfile(currentSession.user.id);
            if (mounted) {
              setProfile(userProfile);
              console.log('✅ Profile loaded, setting stage to ready');
            }
          } else {
            console.log('ℹ️ No user session, setting stage to ready');
          }
          
          setLoadingProgress(100);
          setLoadingStage('ready');
          setLoading(false);
        }
        
        console.log('✅ Auth initialization complete');
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setLoadingStage('error');
          setLoading(false);
          setLoadingProgress(0);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // Listen for auth changes
  useEffect(() => {
    console.log('👂 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔄 Auth state changed:', event, { 
          hasSession: !!newSession, 
          hasUser: !!newSession?.user,
          userId: newSession?.user?.id 
        });
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setProfile(null);
          setLoadingStage('ready');
          setLoading(false);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          console.log('✅ User signed in, loading profile...');
          setLoadingStage('loading_profile');
          setLoading(true);
          
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);
          
          setLoadingStage('ready');
          setLoading(false);
          console.log('🎉 Sign-in process completed');
        }
      }
    );

    return () => {
      console.log('🔇 Unsubscribing from auth state changes');
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
