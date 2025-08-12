
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppNotification {
  id: string;
  sale_id: string;
  recipient_phone: string;
  message_content: string;
  sent_at: string;
  status: string;
  notification_url: string;
  opened_at?: string;
  signed_at?: string;
  api_response?: any;
  created_by?: string;
}

export const useWhatsAppNotifications = (saleId?: string) => {
  return useQuery({
    queryKey: ['whatsapp-notifications', saleId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_notifications')
        .select('*')
        .order('sent_at', { ascending: false });

      if (saleId) {
        query = query.eq('sale_id', saleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppNotification[] || [];
    },
    enabled: !!saleId,
  });
};

export const useSendWhatsAppNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      recipientPhone, 
      messageContent, 
      notificationType 
    }: { 
      saleId: string; 
      recipientPhone: string; 
      messageContent: string; 
      notificationType: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Generate notification URL
      const notificationUrl = `${window.location.origin}/signature/${saleId}`;

      const { data, error } = await supabase
        .from('whatsapp_notifications')
        .insert({
          sale_id: saleId,
          recipient_phone: recipientPhone,
          message_content: messageContent,
          notification_url: notificationUrl,
          status: 'sent',
          created_by: user.user?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Here you would integrate with actual WhatsApp API
      // For now, we'll just simulate success
      console.log('WhatsApp notification sent:', {
        phone: recipientPhone,
        message: messageContent,
        url: notificationUrl
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notifications', variables.saleId] });
      toast.success('Notificación WhatsApp enviada correctamente');
    },
    onError: (error: any) => {
      console.error('Error sending WhatsApp notification:', error);
      toast.error('Error al enviar notificación WhatsApp');
    },
  });
};

export const useUpdateNotificationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      notificationId, 
      status, 
      openedAt, 
      signedAt 
    }: { 
      notificationId: string; 
      status: string; 
      openedAt?: string; 
      signedAt?: string; 
    }) => {
      const updateData: any = { status };
      
      if (openedAt) updateData.opened_at = openedAt;
      if (signedAt) updateData.signed_at = signedAt;

      const { data, error } = await supabase
        .from('whatsapp_notifications')
        .update(updateData)
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notifications'] });
    },
  });
};
