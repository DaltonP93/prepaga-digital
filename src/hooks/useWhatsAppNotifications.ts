
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppNotification {
  id: string;
  sale_id: string;
  recipient_phone: string;
  message_content: string;
  sent_at: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  notification_url: string;
  opened_at?: string;
  signed_at?: string;
  api_response?: any;
  created_by?: string;
  sale?: {
    id: string;
    clients?: {
      first_name: string;
      last_name: string;
    };
  };
}

export const useWhatsAppNotifications = (saleId?: string) => {
  return useQuery({
    queryKey: ['whatsapp-notifications', saleId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_notifications')
        .select(`
          *,
          sale:sales(
            id,
            clients:client_id(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (saleId) {
        query = query.eq('sale_id', saleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppNotification[];
    },
  });
};

export const useSendWhatsAppNotification = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      recipientPhone, 
      messageContent,
      notificationType = 'signature'
    }: { 
      saleId: string; 
      recipientPhone: string; 
      messageContent: string;
      notificationType?: 'signature' | 'questionnaire' | 'general';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      // Generar token único para seguimiento
      const trackingToken = crypto.randomUUID();
      const baseUrl = window.location.origin;
      let notificationUrl;

      switch (notificationType) {
        case 'questionnaire':
          notificationUrl = `${baseUrl}/questionnaire/${trackingToken}`;
          break;
        case 'signature':
          notificationUrl = `${baseUrl}/signature/${trackingToken}`;
          break;
        default:
          notificationUrl = `${baseUrl}/track/${trackingToken}`;
      }

      // Guardar notificación en base de datos
      const { data, error } = await supabase
        .from('whatsapp_notifications')
        .insert({
          sale_id: saleId,
          recipient_phone: recipientPhone,
          message_content: messageContent,
          notification_url: notificationUrl,
          status: 'pending',
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Aquí se integraría con la API de WhatsApp (Chatrace u otra)
      // Por ahora simulamos el envío exitoso
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizar estado a enviado
      await supabase
        .from('whatsapp_notifications')
        .update({ 
          status: 'sent',
          api_response: { 
            message_id: `wa_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', data.id);

      // Registrar en trazabilidad
      await supabase
        .from('process_traces')
        .insert({
          sale_id: saleId,
          action: 'whatsapp_sent',
          performed_by: user.user.id,
          details: { 
            notification_id: data.id,
            notification_type: notificationType,
            recipient_phone: recipientPhone
          }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notifications'] });
      toast({
        title: "Mensaje enviado",
        description: "El mensaje de WhatsApp ha sido enviado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje de WhatsApp.",
        variant: "destructive",
      });
    },
  });
};

export const useTrackNotificationOpening = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase
        .from('whatsapp_notifications')
        .select('*')
        .eq('notification_url', token)
        .single();

      if (error) throw error;

      // Marcar como abierto si no se ha hecho antes
      if (!data.opened_at) {
        await supabase
          .from('whatsapp_notifications')
          .update({ 
            opened_at: new Date().toISOString(),
            status: 'read'
          })
          .eq('id', data.id);

        // Registrar en trazabilidad
        await supabase
          .from('process_traces')
          .insert({
            sale_id: data.sale_id,
            action: 'notification_opened',
            client_action: true,
            details: { notification_id: data.id }
          });
      }

      return data;
    },
  });
};
