import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { whatsAppService, SendWhatsAppParams, WhatsAppTemplateType } from "@/services/WhatsAppService";
import { toast } from "sonner";

export const useWhatsAppService = (saleId?: string) => {
  const queryClient = useQueryClient();

  // Get message history
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["whatsapp-messages", saleId],
    queryFn: () => whatsAppService.getMessageHistory(saleId!),
    enabled: !!saleId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (params: SendWhatsAppParams) => whatsAppService.sendMessage(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Mensaje WhatsApp enviado correctamente");
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", saleId] });
      } else {
        toast.error(`Error al enviar mensaje: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al enviar mensaje: ${error.message}`);
    },
  });

  // Send signature link
  const sendSignatureLink = useMutation({
    mutationFn: (params: Parameters<typeof whatsAppService.sendSignatureLink>[0]) =>
      whatsAppService.sendSignatureLink(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Enlace de firma enviado correctamente");
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", saleId] });
      } else {
        toast.error(`Error al enviar enlace: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al enviar enlace: ${error.message}`);
    },
  });

  // Send questionnaire link
  const sendQuestionnaireLink = useMutation({
    mutationFn: (params: Parameters<typeof whatsAppService.sendQuestionnaireLink>[0]) =>
      whatsAppService.sendQuestionnaireLink(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Enlace de cuestionario enviado correctamente");
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", saleId] });
      } else {
        toast.error(`Error al enviar enlace: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al enviar enlace: ${error.message}`);
    },
  });

  // Send approval notification
  const sendApproval = useMutation({
    mutationFn: (params: Parameters<typeof whatsAppService.sendApprovalNotification>[0]) =>
      whatsAppService.sendApprovalNotification(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Notificación de aprobación enviada");
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", saleId] });
      } else {
        toast.error(`Error al enviar notificación: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al enviar notificación: ${error.message}`);
    },
  });

  // Send rejection notification
  const sendRejection = useMutation({
    mutationFn: (params: Parameters<typeof whatsAppService.sendRejectionNotification>[0]) =>
      whatsAppService.sendRejectionNotification(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Notificación de rechazo enviada");
        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", saleId] });
      } else {
        toast.error(`Error al enviar notificación: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al enviar notificación: ${error.message}`);
    },
  });

  // Trigger reminders
  const triggerReminders = useMutation({
    mutationFn: () => whatsAppService.triggerReminders(),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Se enviaron ${data.remindersSent || 0} recordatorios`);
      } else {
        toast.error(`Error al enviar recordatorios: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error al enviar recordatorios: ${error.message}`);
    },
  });

  return {
    // Data
    messages,
    isLoadingMessages,
    templates: whatsAppService.getAvailableTemplates(),

    // Actions
    sendMessage: sendMessage.mutate,
    sendSignatureLink: sendSignatureLink.mutate,
    sendQuestionnaireLink: sendQuestionnaireLink.mutate,
    sendApproval: sendApproval.mutate,
    sendRejection: sendRejection.mutate,
    triggerReminders: triggerReminders.mutate,

    // Loading states
    isSending: sendMessage.isPending,
    isSendingSignature: sendSignatureLink.isPending,
    isSendingQuestionnaire: sendQuestionnaireLink.isPending,
    isSendingApproval: sendApproval.isPending,
    isSendingRejection: sendRejection.isPending,
    isTriggering: triggerReminders.isPending,
  };
};
