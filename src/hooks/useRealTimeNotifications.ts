
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface RealTimeNotification {
  id: string;
  title: string;
  message: string;
  type: 'signature_completed' | 'signature_pending' | 'document_generated' | 'reminder' | 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url?: string;
  metadata?: any;
  created_at: string;
  user_id: string;
}

export const useRealTimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isSubscribed, sendTestNotification } = usePushNotifications();

  // Configurar suscripción en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const notification = payload.new as RealTimeNotification;
          
          // Actualizar cache de notificaciones
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Mostrar toast
          showNotificationToast(notification);
          
          // Enviar notificación push si está habilitada
          if (isSubscribed) {
            sendPushNotification(notification);
          }
          
          // Reproducir sonido si está habilitado
          playNotificationSound(notification.type);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales'
        },
        (payload) => {
          const sale = payload.new as any;
          
          // Notificar cambios de estado importantes
          if (sale.status === 'firmado' && payload.old?.status !== 'firmado') {
            const notification: RealTimeNotification = {
              id: crypto.randomUUID(),
              title: '¡Documento firmado!',
              message: `El cliente ha firmado el contrato ${sale.contract_number}`,
              type: 'signature_completed',
              read: false,
              action_url: `/sales/${sale.id}`,
              metadata: { sale_id: sale.id },
              created_at: new Date().toISOString(),
              user_id: sale.salesperson_id
            };
            
            showNotificationToast(notification);
            
            if (isSubscribed) {
              sendPushNotification(notification);
            }
            
            playNotificationSound('signature_completed');
          }
          
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('Realtime connection status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast, isSubscribed]);

  const showNotificationToast = (notification: RealTimeNotification) => {
    const variant = getToastVariant(notification.type);
    
    toast({
      title: notification.title,
      description: notification.message,
      variant,
      action: notification.action_url ? (
        <button
          onClick={() => window.location.href = notification.action_url!}
          className="text-sm underline"
        >
          Ver
        </button>
      ) : undefined
    });
  };

  const sendPushNotification = (notification: RealTimeNotification) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: `notification-${notification.id}`,
          data: {
            url: notification.action_url,
            notificationId: notification.id
          },
          actions: notification.action_url ? [
            {
              action: 'view',
              title: 'Ver'
            }
          ] : [],
          requireInteraction: notification.type === 'signature_completed' || notification.type === 'signature_pending'
        });
      });
    }
  };

  const playNotificationSound = (type: string) => {
    const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
    
    if (soundEnabled) {
      const audio = new Audio();
      
      switch (type) {
        case 'signature_completed':
          audio.src = '/sounds/success.mp3';
          break;
        case 'signature_pending':
          audio.src = '/sounds/info.mp3';
          break;
        case 'error':
          audio.src = '/sounds/error.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }
      
      audio.volume = 0.5;
      audio.play().catch(console.error);
    }
  };

  const getToastVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'success':
      case 'signature_completed':
        return 'default';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  // Crear notificación manualmente
  const createNotification = async (notification: Omit<RealTimeNotification, 'id' | 'created_at' | 'user_id'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: userData.user.id
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  };

  // Marcar notificaciones como leídas en tiempo real
  const markAsReadRealTime = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return { success: true };
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    isConnected,
    createNotification,
    markAsReadRealTime,
    showNotificationToast,
    sendPushNotification,
    playNotificationSound
  };
};
