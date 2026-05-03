import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePasswordReset = () => {
  const [loading, setLoading] = useState(false);

  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success('Enlace de recuperación enviado a tu email');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al enviar enlace de recuperación: ' + message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) throw error;
      
      toast.success('Contraseña actualizada exitosamente');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al actualizar contraseña: ' + message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    requestPasswordReset,
    updatePassword,
    loading
  };
};