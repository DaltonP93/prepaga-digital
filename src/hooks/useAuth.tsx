
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
  
  // Improved rate limiting and caching
  const lastFetchTime = useRef<number>(0);
  const profileCache = useRef<{ [key: string]: { profile: Profile; timestamp: number } }>({});
  const isProfileFetching = useRef<boolean>(false);

  const CACHE_DURATION = 60000; // 1 minute cache
  const MIN_FETCH_INTERVAL = 1000; // 1 second minimum between fetches

  const fetchProfile = useCallback(async (userId: string) => {
    const now = Date.now();
    
    // Check cache first
    const cached = profileCache.current[userId];
    if (cached && (now - cached.timestamp < CACHE_DURATION)) {
      console.log('📋 Using cached profile for user:', userId);
      setProfile(cached.profile);
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isProfileFetching.current) {
      console.log('🔄 Profile fetch already in progress, skipping...');
      return;
    }

    // Rate limiting check
    if (now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
      console.log('⏳ Rate limited, waiting...');
      setTimeout(() => fetchProfile(userId), MIN_FETCH_INTERVAL);
      return;
    }

    isProfileFetching.current = true;
    lastFetchTime.current = now;

    try {
      console.log('🔍 Fetching profile for user:', userId);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        
        // Enhanced error handling for rate limiting
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          console.log('📊 Rate limit detected, implementing exponential backoff');
          const retryDelay = Math.min(2000, 500 * Math.pow(2, 1)); // Start with 1 second
          setTimeout(() => {
            if (user?.id === userId) {
              fetchProfile(userId);
            }
          }, retryDelay);
          return;
        }
        
        // If profile doesn't exist, create basic profile from auth data
        if (error.code === 'PGRST116' && user) {
          console.log('🔧 Creating basic profile from auth data');
          const basicProfile: Profile = {
            id: userId,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            role: 'vendedor' as any,
            company_id: null,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone: null,
            avatar_url: null,
          };
          setProfile(basicProfile);
          // Cache the basic profile
          profileCache.current[userId] = { profile: basicProfile, timestamp: now };
        } else {
          setProfile(null);
        }
      } else if (data) {
        console.log('✅ Profile loaded successfully:', data);
        setProfile(data);
        // Cache the profile
        profileCache.current[userId] = { profile: data, timestamp: now };
      } else {
        console.warn('⚠️ No profile found for user:', userId);
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching profile:', error);
      setProfile(null);
    } finally {
      isProfileFetching.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user.id);
          } else {
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event, !!session);
      
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        // Clear cache when user logs out
        profileCache.current = {};
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Clear cache and reset state before signing out
    profileCache.current = {};
    setProfile(null);
    setUser(null);
    
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
