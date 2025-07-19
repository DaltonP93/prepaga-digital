
import { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string }) => Promise<void>;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Rate limiting protection
  const lastFetchTime = useRef<number>(0);
  const fetchAttempts = useRef<number>(0);
  const profileCache = useRef<{ [key: string]: Profile }>({});

  const resetFetchAttempts = useCallback(() => {
    fetchAttempts.current = 0;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    // Rate limiting: minimum 2 seconds between requests
    if (timeSinceLastFetch < 2000) {
      console.log('⏳ Fetch profile rate limited, using cache if available');
      if (profileCache.current[userId]) {
        setProfile(profileCache.current[userId]);
        setLoading(false);
        return;
      }
      // Wait for the remaining time
      await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceLastFetch));
    }

    // Check cache first
    if (profileCache.current[userId]) {
      console.log('📋 Using cached profile for user:', userId);
      setProfile(profileCache.current[userId]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching profile for user:', userId);
      setLoading(true);
      lastFetchTime.current = Date.now();
      fetchAttempts.current++;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        
        // Handle rate limiting
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          const backoffTime = Math.min(5000 * fetchAttempts.current, 30000); // Max 30s
          console.log(`⏳ Rate limited, backing off for ${backoffTime}ms`);
          setTimeout(() => {
            if (user?.id === userId) { // Only retry if user is still the same
              fetchProfile(userId);
            }
          }, backoffTime);
          return;
        }
        
        setProfile(null);
      } else if (data) {
        console.log('✅ Profile found:', data);
        profileCache.current[userId] = data;
        setProfile(data);
        resetFetchAttempts();
      } else {
        console.warn('⚠️ No profile found for user:', userId);
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching profile:', error);
      setProfile(null);
    } finally {
      console.log('🏁 Profile fetch completed, setting loading to false');
      setLoading(false);
    }
  }, [user, resetFetchAttempts]);

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Use setTimeout to defer the profile fetch
            setTimeout(() => {
              if (mounted) {
                fetchProfile(session.user.id);
              }
            }, 100);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes - NO ASYNC HERE
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event, !!session);
      
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to defer Supabase calls
        setTimeout(() => {
          if (mounted) {
            fetchProfile(session.user.id);
          }
        }, 100);
      } else {
        setProfile(null);
        setLoading(false);
        // Clear cache when user logs out
        profileCache.current = {};
        resetFetchAttempts();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, resetFetchAttempts]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Clear cache and reset attempts before signing out
    profileCache.current = {};
    resetFetchAttempts();
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isLoading: loading,
    signIn,
    signOut,
    signUp,
  };
};
