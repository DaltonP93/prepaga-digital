
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthNotifications } from './useAuthNotifications';

interface SessionState {
  session: Session | null;
  isConnected: boolean;
  lastActivity: Date;
  warningShown: boolean;
}

export const useSessionManager = (
  warningMinutes: number = 5,
  timeoutMinutes: number = 30
) => {
  const [sessionState, setSessionState] = useState<SessionState>({
    session: null,
    isConnected: navigator.onLine,
    lastActivity: new Date(),
    warningShown: false
  });

  const { showSessionWarning, showNetworkError } = useAuthNotifications(
    sessionState.session?.user || null
  );

  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Update last activity
  const updateActivity = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      lastActivity: new Date(),
      warningShown: false
    }));
    
    // Clear existing timeouts
    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      if (!sessionState.warningShown) {
        showSessionWarning(warningMinutes);
        setSessionState(prev => ({ ...prev, warningShown: true }));
      }
    }, (timeoutMinutes - warningMinutes) * 60 * 1000);
    
    // Set session timeout
    activityTimeoutRef.current = setTimeout(async () => {
      console.log('Session timed out due to inactivity');
      await supabase.auth.signOut();
    }, timeoutMinutes * 60 * 1000);
  }, [warningMinutes, timeoutMinutes, showSessionWarning, sessionState.warningShown]);

  // Handle connection status
  useEffect(() => {
    const handleOnline = () => {
      setSessionState(prev => ({ ...prev, isConnected: true }));
      console.log('Connection restored');
    };

    const handleOffline = () => {
      setSessionState(prev => ({ ...prev, isConnected: false }));
      showNetworkError();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showNetworkError]);

  // Activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Session heartbeat
  useEffect(() => {
    if (!sessionState.session) return;

    heartbeatIntervalRef.current = setInterval(async () => {
      if (sessionState.isConnected) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('Session lost during heartbeat check');
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Heartbeat check failed:', error);
          setSessionState(prev => ({ ...prev, isConnected: false }));
        }
      }
    }, 60000); // Check every minute

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [sessionState.session, sessionState.isConnected]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSessionState(prev => ({
          ...prev,
          session,
          lastActivity: new Date(),
          warningShown: false
        }));

        if (session) {
          updateActivity();
        } else {
          // Clear all timeouts when signed out
          if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
          if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [updateActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, []);

  return {
    session: sessionState.session,
    isConnected: sessionState.isConnected,
    lastActivity: sessionState.lastActivity,
    updateActivity,
    timeUntilWarning: Math.max(0, (timeoutMinutes - warningMinutes) * 60 * 1000 - (Date.now() - sessionState.lastActivity.getTime())),
    timeUntilTimeout: Math.max(0, timeoutMinutes * 60 * 1000 - (Date.now() - sessionState.lastActivity.getTime()))
  };
};
