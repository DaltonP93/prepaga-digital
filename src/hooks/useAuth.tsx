import { useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { ProfileBackupManager, validateProfileIntegrity } from "@/utils/profileUtils";
import { useAuthNotifications } from "./useAuthNotifications";

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

// Enhanced Profile cache with better error handling
class ProfileCache {
  private static CACHE_KEY = 'user_profile_cache';
  private static TTL = 5 * 60 * 1000; // 5 minutes
  private static cache: { profile: Profile | null; timestamp: number } | null = null;

  static get(userId: string): Profile | null {
    try {
      // Try memory cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.TTL) {
        const profile = this.cache.profile;
        if (profile && validateProfileIntegrity(profile)) {
          return profile;
        }
      }

      // Try localStorage backup
      const stored = localStorage.getItem(`${this.CACHE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.TTL && parsed.profile && validateProfileIntegrity(parsed.profile)) {
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
      if (profile && !validateProfileIntegrity(profile)) {
        console.warn('Invalid profile data, not caching');
        return;
      }

      const cacheData = { profile, timestamp: Date.now() };
      this.cache = cacheData;
      
      // Backup to localStorage and ProfileBackupManager
      localStorage.setItem(`${this.CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
      if (profile) {
        ProfileBackupManager.backupProfile(profile);
      }
    } catch (error) {
      console.warn('Error storing profile cache:', error);
    }
  }

  static clear(userId?: string): void {
    this.cache = null;
    if (userId) {
      try {
        localStorage.removeItem(`${this.CACHE_KEY}_${userId}`);
        ProfileBackupManager.clearBackup(userId);
      } catch (error) {
        console.warn('Error clearing profile cache:', error);
      }
    }
  }
}

// Enhanced Rate limiter with better backoff strategy
class RateLimiter {
  private static lastRequest = 0;
  private static failureCount = 0;
  private static readonly BASE_DELAY = 1000;
  private static readonly MAX_DELAY = 30000;
  
  static async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const delay = this.calculateDelay();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms (failures: ${this.failureCount})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }

  private static calculateDelay(): number {
    if (this.failureCount === 0) return 500;
    const exponentialDelay = Math.min(this.BASE_DELAY * Math.pow(2, this.failureCount - 1), this.MAX_DELAY);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  static recordSuccess(): void {
    this.failureCount = Math.max(0, this.failureCount - 1);
  }

  static recordFailure(): void {
    this.failureCount++;
  }

  static getFailureCount(): number {
    return this.failureCount;
  }
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
  const { showNetworkError, showProfileError } = useAuthNotifications(user);
  
  const fetchAttemptRef = useRef(0);
  const isInitializedRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('connected');
      console.log('Connection restored');
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
      showNetworkError();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showNetworkError]);

  // Enhanced profile creation with better error handling
  const createProfileFromAuth = useCallback(async (user: User): Promise<Profile | null> => {
    try {
      console.log('Creating profile from auth data for user:', user.id);
      setLoadingProgress(25);
      
      const metadata = user.user_metadata || {};
      const email = user.email || '';
      const firstName = metadata.first_name || metadata.name?.split(' ')[0] || '';
      const lastName = metadata.last_name || metadata.name?.split(' ').slice(1).join(' ') || '';
      
      setLoadingProgress(50);
      
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

      setLoadingProgress(75);

      if (error) {
        console.error('Error creating profile from auth:', error);
        
        if (error.code === '23505') {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          setLoadingProgress(100);
          return existingProfile;
        }
        return null;
      }

      console.log('Profile created successfully from auth data');
      setLoadingProgress(100);
      return data;
    } catch (error) {
      console.error('Failed to create profile from auth:', error);
      setLoadingProgress(0);
      return null;
    }
  }, []);

  // Enhanced profile fetching with progress tracking
  const fetchProfile = useCallback(async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    try {
      setLoadingStage(forceRefresh ? 'retrying' : 'loading_profile');
      setLoadingProgress(10);

      if (!forceRefresh) {
        const cachedProfile = ProfileCache.get(userId);
        if (cachedProfile) {
          console.log('Using cached profile');
          setLoadingProgress(100);
          return cachedProfile;
        }
      }

      setLoadingProgress(25);
      setConnectionStatus('reconnecting');
      
      await RateLimiter.waitIfNeeded();
      setLoadingProgress(40);

      console.log('Fetching profile from database for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      setLoadingProgress(70);
      setConnectionStatus('connected');

      if (error) {
        console.error('Error fetching profile:', error);
        RateLimiter.recordFailure();
        
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error('Rate limited');
        }
        
        setLoadingProgress(0);
        return null;
      }

      RateLimiter.recordSuccess();
      setLoadingProgress(85);

      if (!data) {
        console.log('No profile found, attempting to create from auth data');
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser && currentUser.id === userId) {
          const newProfile = await createProfileFromAuth(currentUser);
          if (newProfile) {
            ProfileCache.set(userId, newProfile);
            setLoadingProgress(100);
            return newProfile;
          }
        }
        
        // Try to restore from backup
        const restoredProfile = await ProfileBackupManager.restoreProfileFromBackup(userId);
        if (restoredProfile) {
          ProfileCache.set(userId, restoredProfile);
          setLoadingProgress(100);
          return restoredProfile;
        }
        
        setLoadingProgress(0);
        return null;
      }

      console.log('Profile fetched successfully');
      ProfileCache.set(userId, data);
      setLoadingProgress(100);
      return data;
      
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      RateLimiter.recordFailure();
      setConnectionStatus('disconnected');
      setLoadingProgress(0);
      return null;
    }
  }, [createProfileFromAuth]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    console.log('Refreshing profile...');
    setLastActivity(new Date());
    const freshProfile = await fetchProfile(user.id, false);
    setProfile(freshProfile);
    setLoadingStage(freshProfile ? 'ready' : 'error');
  }, [user, fetchProfile]);

  const forceRefreshProfile = useCallback(async () => {
    if (!user) return;
    
    console.log('Force refreshing profile...');
    setLastActivity(new Date());
    ProfileCache.clear(user.id);
    const freshProfile = await fetchProfile(user.id, true);
    setProfile(freshProfile);
    setLoadingStage(freshProfile ? 'ready' : 'error');
    
    if (!freshProfile) {
      showProfileError();
    }
  }, [user, fetchProfile, showProfileError]);

  const loadUserProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      setLoadingStage('ready');
      setLoadingProgress(0);
      return;
    }

    try {
      setLoading(true);
      setLoadingStage('loading_profile');
      setLoadingProgress(5);
      
      const userProfile = await fetchProfile(currentUser.id);
      
      if (userProfile) {
        setProfile(userProfile);
        setLoadingStage('ready');
      } else {
        // Enhanced fallback with multiple attempts
        const maxAttempts = 3;
        let attempt = 1;
        let fallbackProfile = null;

        while (attempt <= maxAttempts && !fallbackProfile) {
          setLoadingStage('retrying');
          console.log(`Profile fallback attempt ${attempt}/${maxAttempts}`);
          
          // Try backup restoration
          fallbackProfile = await ProfileBackupManager.restoreProfileFromBackup(currentUser.id);
          
          if (!fallbackProfile && attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
          }
          
          attempt++;
        }

        if (fallbackProfile) {
          setProfile(fallbackProfile);
          setLoadingStage('ready');
        } else {
          setProfile(null);
          setLoadingStage('error');
          showProfileError();
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
      setLoadingStage('error');
    } finally {
      setLoading(false);
      setLoadingProgress(100);
    }
  }, [fetchProfile, showProfileError]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingStage('initializing');
      setLoadingProgress(25);
      
      if (user) {
        ProfileCache.clear(user.id);
      }
      
      setLoadingProgress(50);
      
      const { error } = await supabase.auth.signOut();
      setLoadingProgress(75);
      
      if (error) {
        console.error('Error signing out:', error);
        toast({
          title: "Error al cerrar sesión",
          description: "Hubo un problema al cerrar la sesión.",
          variant: "destructive",
        });
      }
      
      setLoadingProgress(100);
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    } finally {
      setLoading(false);
      setLoadingStage('ready');
    }
  }, [user, toast]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoadingStage('initializing');
        setLoadingProgress(10);
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setLoadingProgress(30);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoadingProgress(50);
        
        if (currentSession?.user) {
          await loadUserProfile(currentSession.user);
        } else {
          setLoading(false);
          setLoadingStage('ready');
          setLoadingProgress(100);
        }
        
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
        setLoadingStage('error');
        setLoadingProgress(0);
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
        setLastActivity(new Date());
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoadingStage('ready');
          ProfileCache.clear();
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          await loadUserProfile(newSession.user);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          if (!profile) {
            await loadUserProfile(newSession.user);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
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
    connectionStatus,
    lastActivity,
    loadingStage,
    loadingProgress,
  };
};
