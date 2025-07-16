
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useNotifications = () => {
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo marcar la notificación como leída",
        variant: "destructive"
      });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Éxito",
        description: "Todas las notificaciones marcadas como leídas"
      });
    }
  });

  // Create notification function
  const createNotification = useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: userData.user.id
        });
      
      if (error) throw error;
    }
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          // Refresh notifications when new one is inserted
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Show toast for new notification
          const newNotification = payload.new as Notification;
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' : 'default'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Legacy functions for backward compatibility
  const sendSignatureNotification = async (saleData: any, signatureUrl: string) => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'signature_request',
          to: saleData.clients?.email,
          data: {
            clientName: `${saleData.clients?.first_name} ${saleData.clients?.last_name}`,
            planName: saleData.plans?.name,
            signatureUrl,
            expiresAt: saleData.signature_expires_at,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Notificación enviada",
        description: "Se ha enviado el enlace de firma por email al cliente.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la notificación.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsSending(false);
    }
  };

  const sendCompletionNotification = async (saleData: any) => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'signature_completed',
          to: saleData.profiles?.email, // Notificar al vendedor
          data: {
            clientName: `${saleData.clients?.first_name} ${saleData.clients?.last_name}`,
            planName: saleData.plans?.name,
            totalAmount: saleData.total_amount,
          }
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error sending completion notification:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSending(false);
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    // New notification system
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    createNotification: createNotification.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    
    // Legacy functions
    sendSignatureNotification,
    sendCompletionNotification,
    isSending,
  };
};
