import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemStatusItem {
  id: string;
  name: string;
  status: 'completed' | 'pending' | 'error' | 'warning';
  priority: 'high' | 'medium' | 'low';
  lastChecked: Date;
}

export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const checkSystemStatus = async () => {
    setIsLoading(true);
    
    try {
      // Verificar conexión a base de datos
      const dbStatus = await checkDatabaseConnection();
      
      // Verificar configuración de Stripe
      const stripeStatus = await checkStripeConfiguration();
      
      // Verificar funciones edge
      const edgeFunctionsStatus = await checkEdgeFunctions();
      
      // Verificar autenticación
      const authStatus = await checkAuthentication();

      const systemChecks: SystemStatusItem[] = [
        {
          id: 'database',
          name: 'Base de Datos',
          status: dbStatus,
          priority: 'high',
          lastChecked: new Date()
        },
        {
          id: 'auth',
          name: 'Autenticación',
          status: authStatus,
          priority: 'high',
          lastChecked: new Date()
        },
        {
          id: 'stripe',
          name: 'Pagos (Stripe)',
          status: stripeStatus,
          priority: 'high',
          lastChecked: new Date()
        },
        {
          id: 'edge_functions',
          name: 'Edge Functions',
          status: edgeFunctionsStatus,
          priority: 'medium',
          lastChecked: new Date()
        }
      ];

      setStatus(systemChecks);
      
      // Calcular porcentaje de completación
      const completed = systemChecks.filter(item => item.status === 'completed').length;
      const percentage = Math.round((completed / systemChecks.length) * 100);
      setCompletionPercentage(percentage);
      
    } catch (error) {
      console.error('Error checking system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDatabaseConnection = async (): Promise<'completed' | 'error'> => {
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      return error ? 'error' : 'completed';
    } catch {
      return 'error';
    }
  };

  const checkStripeConfiguration = async (): Promise<'completed' | 'pending' | 'error'> => {
    try {
      const { error } = await supabase.functions.invoke('create-payment', {
        body: { test: true }
      });
      
      if (error) {
        if (error.message?.includes('STRIPE_SECRET_KEY')) {
          return 'pending';
        }
        return 'error';
      }
      
      return 'completed';
    } catch {
      return 'pending';
    }
  };

  const checkEdgeFunctions = async (): Promise<'completed' | 'error'> => {
    try {
      // Verificar función de notificaciones
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { test: true }
      });
      
      return error ? 'error' : 'completed';
    } catch {
      return 'error';
    }
  };

  const checkAuthentication = async (): Promise<'completed' | 'error'> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user ? 'completed' : 'error';
    } catch {
      return 'error';
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  return {
    status,
    isLoading,
    completionPercentage,
    refresh: checkSystemStatus
  };
};