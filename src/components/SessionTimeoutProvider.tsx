
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
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
  timeoutMinutes = 30,
  warningMinutes = 5 
}: SessionTimeoutProviderProps) => {
  const [lastActivity, setLastActivity] = useState(new Date());
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { user, signOut } = useAuthContext();

  const resetTimeout = () => {
    setLastActivity(new Date());
    setShowWarning(false);
  };

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // minutos

      if (timeSinceLastActivity >= timeoutMinutes) {
        // Timeout - cerrar sesión automáticamente
        signOut();
        localStorage.clear();
        sessionStorage.clear();
      } else if (timeSinceLastActivity >= timeoutMinutes - warningMinutes) {
        // Mostrar advertencia
        const remaining = Math.ceil(timeoutMinutes - timeSinceLastActivity);
        setTimeLeft(remaining);
        setShowWarning(true);
      }
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(interval);
  }, [lastActivity, timeoutMinutes, warningMinutes, user, signOut]);

  const handleExtendSession = () => {
    resetTimeout();
  };

  const handleLogoutNow = () => {
    signOut();
    localStorage.clear();
    sessionStorage.clear();
  };

  return (
    <SessionTimeoutContext.Provider value={{ lastActivity, resetTimeout }}>
      {children}
      <SessionTimeoutDialog
        open={showWarning}
        timeLeft={timeLeft}
        onExtend={handleExtendSession}
        onLogout={handleLogoutNow}
      />
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
