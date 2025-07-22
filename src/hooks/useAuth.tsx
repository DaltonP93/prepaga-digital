
import { useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [lastActivity, setLastActivity] = useState(new Date());
  const [loadingStage, setLoadingStage] = useState<'initializing' | 'loading_profile' | 'retrying' | 'ready' | 'error'>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const { toast } = useToast();
  const isInitializedRef = useRef(false);

  // Simplified profile fetching
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
      }

      console.log('✅ Profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
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
        toast({
          title: "Error al cerrar sesión",
          description: "Hubo un problema al cerrar la sesión.",
          variant: "destructive",
        });
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
  }, [toast]);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize auth state - SIMPLIFIED
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        setLoadingStage('initializing');
        setLoadingProgress(10);
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setLoadingProgress(30);
        
        console.log('📊 Current session:', { 
          hasSession: !!currentSession, 
          hasUser: !!currentSession?.user,
          userId: currentSession?.user?.id 
        });
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoadingProgress(50);
        
        // Load profile if user exists
        if (currentSession?.user) {
          setLoadingStage('loading_profile');
          setLoadingProgress(60);
          
          const userProfile = await fetchProfile(currentSession.user.id);
          setProfile(userProfile);
          setLoadingProgress(100);
        }
        
        setLoadingStage('ready');
        setLoading(false);
        
        isInitializedRef.current = true;
        console.log('✅ Auth initialization complete');
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        setLoadingStage('ready');
        setLoading(false);
        setLoadingProgress(0);
        isInitializedRef.current = true;
      }
    };

    initializeAuth();
  }, [fetchProfile]);

  // Listen for auth changes - SIMPLIFIED
  useEffect(() => {
    console.log('👂 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔄 Auth state changed:', event, { 
          hasSession: !!newSession, 
          hasUser: !!newSession?.user,
          userId: newSession?.user?.id 
        });
        
        setLastActivity(new Date());
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
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
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          if (!profile) {
            console.log('🔄 Token refreshed, loading profile if missing');
            const userProfile = await fetchProfile(newSession.user.id);
            setProfile(userProfile);
          }
        }
      }
    );

    return () => {
      console.log('🔇 Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, [fetchProfile, profile]);

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
