
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useNotifications = () => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

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

  return {
    sendSignatureNotification,
    sendCompletionNotification,
    isSending,
  };
};
