
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
}

// Profile cache with TTL and localStorage backup
class ProfileCache {
  private static CACHE_KEY = 'user_profile_cache';
  private static TTL = 5 * 60 * 1000; // 5 minutes
  private static cache: { profile: Profile | null; timestamp: number } | null = null;

  static get(userId: string): Profile | null {
    try {
      // Try memory cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.TTL) {
        return this.cache.profile;
      }

      // Try localStorage backup
      const stored = localStorage.getItem(`${this.CACHE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.TTL) {
          this.cache = parsed;
          return parsed.profile;
        }
      }
    } catch (error) {
      console.warn('Error reading profile cache:', error);
    }
    return null;
  }

  static set(userId: string, profile: Profile | null): void {
    try {
      const cacheData = { profile, timestamp: Date.now() };
      this.cache = cacheData;
      
      // Backup to localStorage
      localStorage.setItem(`${this.CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error storing profile cache:', error);
    }
  }

  static clear(userId?: string): void {
    this.cache = null;
    if (userId) {
      try {
        localStorage.removeItem(`${this.CACHE_KEY}_${userId}`);
      } catch (error) {
        console.warn('Error clearing profile cache:', error);
      }
    }
  }

  static getCriticalData(userId: string): { email?: string; role?: string; company_id?: string } | null {
    try {
      const profile = this.get(userId);
      if (profile) {
        return {
          email: profile.email,
          role: profile.role,
          company_id: profile.company_id || undefined
        };
      }
    } catch (error) {
      console.warn('Error getting critical profile data:', error);
    }
    return null;
  }
}

// Rate limiter with exponential backoff
class RateLimiter {
  private static lastRequest = 0;
  private static failureCount = 0;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 30000; // 30 seconds

  static async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const delay = this.calculateDelay();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }

  private static calculateDelay(): number {
    if (this.failureCount === 0) return 500; // Normal delay
    return Math.min(this.BASE_DELAY * Math.pow(2, this.failureCount - 1), this.MAX_DELAY);
  }

  static recordSuccess(): void {
    this.failureCount = 0;
  }

  static recordFailure(): void {
    this.failureCount++;
  }
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const fetchAttemptRef = useRef(0);
  const isInitializedRef = useRef(false);

  // Create profile from auth data as fallback
  const createProfileFromAuth = useCallback(async (user: User): Promise<Profile | null> => {
    try {
      console.log('Creating profile from auth data for user:', user.id);
      
      // Extract data from user metadata
      const metadata = user.user_metadata || {};
      const email = user.email || '';
      const firstName = metadata.first_name || metadata.name?.split(' ')[0] || '';
      const lastName = metadata.last_name || metadata.name?.split(' ').slice(1).join(' ') || '';
      
      // Try to create the profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: 'vendedor',
          active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile from auth:', error);
        
        // If profile already exists, try to fetch it
        if (error.code === '23505') {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          return existingProfile;
        }
        return null;
      }

      console.log('Profile created successfully from auth data');
      return data;
    } catch (error) {
      console.error('Failed to create profile from auth:', error);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    try {
      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cachedProfile = ProfileCache.get(userId);
        if (cachedProfile) {
          console.log('Using cached profile');
          return cachedProfile;
        }
      }

      // Apply rate limiting
      await RateLimiter.waitIfNeeded();

      console.log('Fetching profile from database for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        RateLimiter.recordFailure();
        
        // If it's a rate limiting error, throw to trigger exponential backoff
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error('Rate limited');
        }
        
        return null;
      }

      RateLimiter.recordSuccess();

      if (!data) {
        console.log('No profile found, attempting to create from auth data');
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser && currentUser.id === userId) {
          const newProfile = await createProfileFromAuth(currentUser);
          if (newProfile) {
            ProfileCache.set(userId, newProfile);
            return newProfile;
          }
        }
        return null;
      }

      console.log('Profile fetched successfully');
      ProfileCache.set(userId, data);
      return data;
      
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      RateLimiter.recordFailure();
      return null;
    }
  }, [createProfileFromAuth]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    console.log('Refreshing profile...');
    const freshProfile = await fetchProfile(user.id, false);
    setProfile(freshProfile);
  }, [user, fetchProfile]);

  const forceRefreshProfile = useCallback(async () => {
    if (!user) return;
    
    console.log('Force refreshing profile...');
    ProfileCache.clear(user.id);
    const freshProfile = await fetchProfile(user.id, true);
    setProfile(freshProfile);
    
    if (!freshProfile) {
      toast({
        title: "Error al actualizar perfil",
        description: "No se pudo actualizar el perfil. Intente cerrar sesión y volver a iniciar.",
        variant: "destructive",
      });
    }
  }, [user, fetchProfile, toast]);

  const loadUserProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userProfile = await fetchProfile(currentUser.id);
      
      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Try to get critical data from cache as last resort
        const criticalData = ProfileCache.getCriticalData(currentUser.id);
        if (criticalData) {
          console.log('Using critical data from cache');
          // Create a minimal profile object with critical data
          const minimalProfile: Profile = {
            id: currentUser.id,
            email: criticalData.email || currentUser.email || '',
            first_name: '',
            last_name: '',
            role: (criticalData.role as any) || 'vendedor',
            company_id: criticalData.company_id || null,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone: null,
            avatar_url: null
          };
          setProfile(minimalProfile);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear cache before signing out
      if (user) {
        ProfileCache.clear(user.id);
      }
      
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
      setLoading(false);
    }
  }, [user, toast]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await loadUserProfile(currentSession.user);
        } else {
          setLoading(false);
        }
        
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
        isInitializedRef.current = true;
      }
    };

    if (!isInitializedRef.current) {
      initializeAuth();
    }
  }, [loadUserProfile]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          ProfileCache.clear();
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          await loadUserProfile(newSession.user);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Don't reload profile on token refresh unless we don't have one
          if (!profile) {
            await loadUserProfile(newSession.user);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, profile]);

  return {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshProfile,
    forceRefreshProfile,
  };
};
