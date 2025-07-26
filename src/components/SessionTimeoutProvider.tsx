
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { SessionTimeoutDialog } from './SessionTimeoutDialog';

interface SessionTimeoutContextType {
  lastActivity: Date;
  resetTimeout: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

interface SessionTimeoutProviderProps {
  children: ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export const SessionTimeoutProvider = ({ 
  children, 
  timeoutMinutes = 240, // 4 horas por defecto
  warningMinutes = 10   // 10 minutos de aviso
}: SessionTimeoutProviderProps) => {
  const [lastActivity, setLastActivity] = useState(new Date());
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { user, signOut } = useSimpleAuthContext();

  // Solo activar en producción
  const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('lovableproject.com');

  const resetTimeout = () => {
    console.log('🔄 Session timeout reset');
    setLastActivity(new Date());
    setShowWarning(false);
  };

  useEffect(() => {
    if (!user || !isProduction) {
      console.log('⏰ Session timeout disabled:', !user ? 'no user' : 'development mode');
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, isProduction]);

  useEffect(() => {
    if (!user || !isProduction) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // minutos

      console.log(`⏰ Session check: ${Math.round(timeSinceLastActivity)} minutes since last activity`);

      if (timeSinceLastActivity >= timeoutMinutes) {
        console.log('🚪 Auto logout due to inactivity');
        signOut();
        localStorage.clear();
        sessionStorage.clear();
      } else if (timeSinceLastActivity >= timeoutMinutes - warningMinutes) {
        const remaining = Math.ceil(timeoutMinutes - timeSinceLastActivity);
        console.log(`⚠️ Session warning: ${remaining} minutes remaining`);
        setTimeLeft(remaining);
        setShowWarning(true);
      }
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [lastActivity, timeoutMinutes, warningMinutes, user, signOut, isProduction]);

  const handleExtendSession = () => {
    console.log('✅ Session extended by user');
    resetTimeout();
  };

  const handleLogoutNow = () => {
    console.log('🚪 Manual logout from timeout dialog');
    signOut();
    localStorage.clear();
    sessionStorage.clear();
  };

  return (
    <SessionTimeoutContext.Provider value={{ lastActivity, resetTimeout }}>
      {children}
      {isProduction && (
        <SessionTimeoutDialog
          open={showWarning}
          timeLeft={timeLeft}
          onExtend={handleExtendSession}
          onLogout={handleLogoutNow}
        />
      )}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
};
