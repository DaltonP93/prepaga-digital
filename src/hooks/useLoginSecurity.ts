
import { useState, useEffect } from 'react';

export const useLoginSecurity = () => {
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);

  // Manejo de bloqueo por intentos fallidos
  useEffect(() => {
    const storedAttempts = localStorage.getItem('loginAttempts');
    const lastAttempt = localStorage.getItem('lastLoginAttempt');
    
    if (storedAttempts && lastAttempt) {
      const attempts = parseInt(storedAttempts);
      const lastAttemptTime = new Date(lastAttempt);
      const now = new Date();
      const timeDiff = (now.getTime() - lastAttemptTime.getTime()) / 1000 / 60; // minutos
      
      if (attempts >= 5 && timeDiff < 15) {
        setIsBlocked(true);
        setLoginAttempts(attempts);
        setBlockTimeLeft(Math.ceil(15 - timeDiff));
        
        const timer = setInterval(() => {
          setBlockTimeLeft(prev => {
            if (prev <= 1) {
              setIsBlocked(false);
              setLoginAttempts(0);
              localStorage.removeItem('loginAttempts');
              localStorage.removeItem('lastLoginAttempt');
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 60000);
        
        return () => clearInterval(timer);
      } else if (timeDiff >= 15) {
        // Reset después de 15 minutos
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lastLoginAttempt');
        setLoginAttempts(0);
      } else {
        setLoginAttempts(attempts);
      }
    }
  }, []);

  const recordFailedAttempt = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    localStorage.setItem('loginAttempts', newAttempts.toString());
    localStorage.setItem('lastLoginAttempt', new Date().toISOString());
    
    if (newAttempts >= 5) {
      setIsBlocked(true);
      setBlockTimeLeft(15);
      return { isBlocked: true, message: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.' };
    }
    
    return { isBlocked: false, message: `Error al iniciar sesión. Intentos restantes: ${5 - newAttempts}` };
  };

  const resetAttempts = () => {
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lastLoginAttempt');
    setLoginAttempts(0);
  };

  return {
    loginAttempts,
    isBlocked,
    blockTimeLeft,
    recordFailedAttempt,
    resetAttempts
  };
};
