
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthNotificationConfig {
  showWelcome?: boolean;
  showSessionExpiry?: boolean;
  showConnectionIssues?: boolean;
  showProfileUpdates?: boolean;
}

export const useAuthNotifications = (
  user: User | null,
  config: AuthNotificationConfig = {}
) => {
  const { toast } = useToast();
  const {
    showWelcome = true,
    showSessionExpiry = true,
    showConnectionIssues = true,
    showProfileUpdates = true
  } = config;

  useEffect(() => {
    if (!user) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        switch (event) {
          case 'SIGNED_IN':
            if (showWelcome) {
              toast({
                title: "¡Bienvenido!",
                description: "Has iniciado sesión correctamente.",
                duration: 3000,
              });
            }
            break;
          
          case 'SIGNED_OUT':
            toast({
              title: "Sesión cerrada",
              description: "Has cerrado sesión correctamente.",
              duration: 3000,
            });
            break;
          
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed successfully');
            break;
          
          case 'USER_UPDATED':
            if (showProfileUpdates) {
              toast({
                title: "Perfil actualizado",
                description: "Tu información ha sido actualizada.",
                duration: 3000,
              });
            }
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [user, toast, showWelcome, showSessionExpiry, showConnectionIssues, showProfileUpdates]);

  const showNetworkError = () => {
    if (showConnectionIssues) {
      toast({
        title: "Problema de conexión",
        description: "Verifica tu conexión a internet e intenta nuevamente.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const showSessionWarning = (minutes: number) => {
    if (showSessionExpiry) {
      toast({
        title: "Sesión por expirar",
        description: `Tu sesión expirará en ${minutes} minutos. Guarda tu trabajo.`,
        duration: 10000,
      });
    }
  };

  const showProfileError = () => {
    toast({
      title: "Error de perfil",
      description: "No se pudo cargar tu perfil. Intenta actualizar la página.",
      variant: "destructive",
      duration: 8000,
    });
  };

  return {
    showNetworkError,
    showSessionWarning,
    showProfileError
  };
};
