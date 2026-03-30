
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { SessionTimeoutDialog } from './SessionTimeoutDialog';

interface SessionTimeoutContextType {
  lastActivity: Date;
  resetTimeout: () => void;
}

interface SessionConfig {
  enabled: boolean;
  timeoutMinutes: number;
  warningMinutes: number;
  showWarnings: boolean;
  clearDataOnTimeout: boolean;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

interface SessionTimeoutProviderProps {
  children: ReactNode;
}

export const SessionTimeoutProvider = ({ children }: SessionTimeoutProviderProps) => {
  const [lastActivity, setLastActivity] = useState(new Date());
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [config, setConfig] = useState<SessionConfig>({
    enabled: true,
    timeoutMinutes: 30,
    warningMinutes: 5,
    showWarnings: true,
    clearDataOnTimeout: true
  });
  
  const { user, signOut } = useSimpleAuthContext();

  // Solo activar en producción
  const isProduction = window.location.hostname !== 'localhost';

  // Cargar configuración
  useEffect(() => {
    const loadConfig = () => {
      const savedConfig = localStorage.getItem('session-config');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(parsedConfig);
        } catch (error) {
          console.error('Error loading session config:', error);
        }
      }
    };

    loadConfig();

    // Escuchar cambios en la configuración
    const handleConfigUpdate = (event: CustomEvent) => {
      setConfig(event.detail);
    };

    window.addEventListener('session-config-updated', handleConfigUpdate as EventListener);
    
    return () => {
      window.removeEventListener('session-config-updated', handleConfigUpdate as EventListener);
    };
  }, []);

  const resetTimeout = () => {
    setLastActivity(new Date());
    setShowWarning(false);
  };

  useEffect(() => {
    if (!user || !isProduction || !config.enabled) {
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
  }, [user, isProduction, config.enabled]);

  useEffect(() => {
    if (!user || !isProduction || !config.enabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // minutos

      if (timeSinceLastActivity >= config.timeoutMinutes) {
        signOut();
        
        // Limpiar datos si está configurado
        if (config.clearDataOnTimeout) {
          localStorage.clear();
          sessionStorage.clear();
        }
      } else if (config.showWarnings && timeSinceLastActivity >= config.timeoutMinutes - config.warningMinutes) {
        const remaining = Math.ceil(config.timeoutMinutes - timeSinceLastActivity);
        setTimeLeft(remaining);
        setShowWarning(true);
      }
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [lastActivity, config, user, signOut, isProduction]);

  const handleExtendSession = () => {
    resetTimeout();
  };

  const handleLogoutNow = () => {
    signOut();
    
    if (config.clearDataOnTimeout) {
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  return (
    <SessionTimeoutContext.Provider value={{ lastActivity, resetTimeout }}>
      {children}
      {isProduction && config.enabled && (
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
