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
      notificationType,
      templateName,
      templateData,
    }: {
      saleId: string;
      recipientPhone: string;
      messageContent: string;
      companyId: string;
      notificationType?: string;
      templateName?: string;
      templateData?: Record<string, string>;
    }) => {
      // 1. Insert notification record as "pending"
      const { data: notification, error: insertError } = await supabase
        .from("whatsapp_notifications")
        .insert({
          sale_id: saleId,
          phone_number: recipientPhone,
          message: messageContent,
          status: "pending",
          company_id: companyId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Call Edge Function to actually send via WhatsApp Business API
      const edgePayload: Record<string, unknown> = {
        to: recipientPhone,
        templateName: templateName || notificationType || "general",
        templateData: templateData || { message: messageContent },
        saleId,
        companyId,
        messageType: notificationType || "general",
      };

      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(
        "send-whatsapp",
        { body: edgePayload }
      );

      // 3. Update notification status based on Edge Function result
      if (edgeError) {
        await supabase
          .from("whatsapp_notifications")
          .update({
            status: "failed",
            error_message: edgeError.message || "Error al invocar Edge Function",
          })
          .eq("id", notification.id);
        throw new Error(edgeError.message || "Error al enviar WhatsApp");
      }

      // 4. Handle wa.me fallback: open WhatsApp Web with pre-loaded message
      if (edgeResult?.fallback && edgeResult?.wameUrl) {
        await supabase
          .from("whatsapp_notifications")
          .update({
            status: "sent_manual",
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        // Open WhatsApp Web in new tab
        window.open(edgeResult.wameUrl, "_blank");

        return { ...notification, status: "sent_manual", provider: "wame_fallback", edgeResult };
      }

      await supabase
        .from("whatsapp_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      return { ...notification, status: "sent", provider: edgeResult?.provider || "meta", edgeResult };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-notifications", variables.saleId],
      });
      if (data?.provider === "wame_fallback") {
        toast.success("WhatsApp Web abierto. Presiona 'Enviar' en la pestaña de WhatsApp.");
      } else {
        toast.success("Notificación WhatsApp enviada correctamente");
      }
    },
    onError: (error: any) => {
      console.error("Error sending WhatsApp notification:", error);
      toast.error(error.message || "Error al enviar notificación WhatsApp");
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
