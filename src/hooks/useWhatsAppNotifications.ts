import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Match the actual database schema for whatsapp_notifications table
interface WhatsAppNotification {
  id: string;
  sale_id: string | null;
  phone_number: string;
  message: string;
  sent_at: string | null;
  status: string;
  error_message: string | null;
  company_id: string;
  created_at: string;
}

export const useWhatsAppNotifications = (saleId?: string) => {
  return useQuery({
    queryKey: ["whatsapp-notifications", saleId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (saleId) {
        query = query.eq("sale_id", saleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as WhatsAppNotification[]) || [];
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
      companyId,
    }: {
      saleId: string;
      recipientPhone: string;
      messageContent: string;
      companyId: string;
      notificationType?: string;
    }) => {
      const { data, error } = await supabase
        .from("whatsapp_notifications")
        .insert({
          sale_id: saleId,
          phone_number: recipientPhone,
          message: messageContent,
          status: "sent",
          company_id: companyId,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Here you would integrate with actual WhatsApp API
      console.log("WhatsApp notification sent:", {
        phone: recipientPhone,
        message: messageContent,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-notifications", variables.saleId],
      });
      toast.success("Notificación WhatsApp enviada correctamente");
    },
    onError: (error: any) => {
      console.error("Error sending WhatsApp notification:", error);
      toast.error("Error al enviar notificación WhatsApp");
    },
  });
};

export const useUpdateNotificationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      notificationId,
      status,
      errorMessage,
    }: {
      notificationId: string;
      status: string;
      errorMessage?: string;
    }) => {
      const updateData: any = { status };

      if (errorMessage) updateData.error_message = errorMessage;

      const { data, error } = await supabase
        .from("whatsapp_notifications")
        .update(updateData)
        .eq("id", notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-notifications"] });
    },
  });
};
