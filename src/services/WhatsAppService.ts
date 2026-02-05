import { supabase } from "@/integrations/supabase/client";

export type WhatsAppTemplateType = 
  | 'signature_link' 
  | 'questionnaire' 
  | 'reminder' 
  | 'approval' 
  | 'rejection' 
  | 'general';

export interface WhatsAppTemplateData {
  clientName: string;
  companyName: string;
  signatureUrl?: string;
  questionnaireUrl?: string;
  expirationDate?: string;
  contractNumber?: string;
  planName?: string;
  rejectionReason?: string;
  message?: string;
}

export interface SendWhatsAppParams {
  to: string;
  templateName: WhatsAppTemplateType;
  templateData: WhatsAppTemplateData;
  saleId?: string;
  companyId: string;
}

export interface WhatsAppMessage {
  id: string;
  company_id: string;
  sale_id: string | null;
  signature_link_id: string | null;
  phone_number: string;
  message_type: string;
  message_body: string | null;
  whatsapp_message_id: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
}

class WhatsAppService {
  /**
   * Send a WhatsApp message using a template
   */
  async sendMessage(params: SendWhatsAppParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: params.to,
          templateName: params.templateName,
          templateData: params.templateData,
          saleId: params.saleId,
          companyId: params.companyId,
          messageType: params.templateName,
        },
      });

      if (error) {
        console.error('Error invoking send-whatsapp function:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send signature link to a client
   */
  async sendSignatureLink(params: {
    clientPhone: string;
    clientName: string;
    companyName: string;
    signatureUrl: string;
    expirationDate: string;
    saleId: string;
    companyId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendMessage({
      to: params.clientPhone,
      templateName: 'signature_link',
      templateData: {
        clientName: params.clientName,
        companyName: params.companyName,
        signatureUrl: params.signatureUrl,
        expirationDate: params.expirationDate,
      },
      saleId: params.saleId,
      companyId: params.companyId,
    });
  }

  /**
   * Send questionnaire link to a client
   */
  async sendQuestionnaireLink(params: {
    clientPhone: string;
    clientName: string;
    companyName: string;
    questionnaireUrl: string;
    saleId: string;
    companyId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendMessage({
      to: params.clientPhone,
      templateName: 'questionnaire',
      templateData: {
        clientName: params.clientName,
        companyName: params.companyName,
        questionnaireUrl: params.questionnaireUrl,
      },
      saleId: params.saleId,
      companyId: params.companyId,
    });
  }

  /**
   * Send approval notification
   */
  async sendApprovalNotification(params: {
    clientPhone: string;
    clientName: string;
    companyName: string;
    contractNumber: string;
    planName: string;
    saleId: string;
    companyId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendMessage({
      to: params.clientPhone,
      templateName: 'approval',
      templateData: {
        clientName: params.clientName,
        companyName: params.companyName,
        contractNumber: params.contractNumber,
        planName: params.planName,
      },
      saleId: params.saleId,
      companyId: params.companyId,
    });
  }

  /**
   * Send rejection notification
   */
  async sendRejectionNotification(params: {
    clientPhone: string;
    clientName: string;
    companyName: string;
    rejectionReason: string;
    saleId: string;
    companyId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendMessage({
      to: params.clientPhone,
      templateName: 'rejection',
      templateData: {
        clientName: params.clientName,
        companyName: params.companyName,
        rejectionReason: params.rejectionReason,
      },
      saleId: params.saleId,
      companyId: params.companyId,
    });
  }

  /**
   * Get message history for a sale
   */
  async getMessageHistory(saleId: string): Promise<WhatsAppMessage[]> {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching WhatsApp messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Trigger scheduled reminders manually
   */
  async triggerReminders(): Promise<{ success: boolean; remindersSent?: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('schedule-reminders');

      if (error) {
        console.error('Error invoking schedule-reminders:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error: any) {
      console.error('Error triggering reminders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): { id: WhatsAppTemplateType; name: string; description: string }[] {
    return [
      {
        id: 'signature_link',
        name: 'Enlace de Firma',
        description: 'Envía el enlace para firma digital del contrato',
      },
      {
        id: 'questionnaire',
        name: 'Cuestionario',
        description: 'Envía enlace para completar cuestionario de salud',
      },
      {
        id: 'reminder',
        name: 'Recordatorio',
        description: 'Recordatorio de documentos pendientes de firma',
      },
      {
        id: 'approval',
        name: 'Aprobación',
        description: 'Notificación de solicitud aprobada',
      },
      {
        id: 'rejection',
        name: 'Rechazo',
        description: 'Notificación de solicitud rechazada',
      },
      {
        id: 'general',
        name: 'General',
        description: 'Mensaje personalizado',
      },
    ];
  }
}

export const whatsAppService = new WhatsAppService();
