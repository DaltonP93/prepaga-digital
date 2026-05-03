import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export const useNotifications = () => {
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return data || [];
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      return notificationId;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueryData<NotificationRow[]>(['notifications']);

      queryClient.setQueryData<NotificationRow[]>(['notifications'], (current = []) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      
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

  useEffect(() => {
    const channel = supabase
      .channel('notifications-user-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const sendSignatureNotification = async (saleData: Record<string, unknown>, signatureUrl: string) => {
    setIsSending(true);
    try {
      const clients = saleData.clients as Record<string, unknown> | undefined;
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'signature_request',
          to: clients?.email as string | undefined,
          data: { clientName: `${clients?.first_name as string | undefined} ${clients?.last_name as string | undefined}`, signatureUrl }
        }
      });
      if (error) throw error;
      toast({ title: "Notificación enviada" });
      return { success: true };
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : 'Error al enviar notificación', variant: "destructive" });
      return { success: false };
    } finally {
      setIsSending(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutate,
    sendSignatureNotification,
    isSending,
  };
};
