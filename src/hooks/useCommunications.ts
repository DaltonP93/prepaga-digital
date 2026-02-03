import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";

// Use actual DB types
type EmailCampaignRow = Database['public']['Tables']['email_campaigns']['Row'];
type EmailTemplateRow = Database['public']['Tables']['email_templates']['Row'];
type CommunicationLogRow = Database['public']['Tables']['communication_logs']['Row'];
type SmsCampaignRow = Database['public']['Tables']['sms_campaigns']['Row'];

export const useCommunications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Email Campaigns
  const { data: emailCampaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Email Templates
  const { data: emailTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // SMS Campaigns
  const { data: smsCampaigns, isLoading: isLoadingSmsCampaigns } = useQuery({
    queryKey: ['sms-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Communication Logs
  const { data: communicationLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['communication-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Crear campaña de email
  const createEmailCampaign = useMutation({
    mutationFn: async (campaignData: Omit<EmailCampaignRow, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({
        title: "Campaña creada",
        description: "La campaña de email ha sido creada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la campaña de email.",
        variant: "destructive",
      });
    },
  });

  // Enviar campaña de email
  const sendEmailCampaign = useMutation({
    mutationFn: async ({ 
      campaignId, 
      recipients, 
      subject, 
      content, 
      companyId 
    }: {
      campaignId: string;
      recipients: Array<{ id: string; email: string; name?: string }>;
      subject: string;
      content: string;
      companyId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-email-campaign', {
        body: { campaignId, recipients, subject, content, companyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      toast({
        title: "Campaña enviada",
        description: "La campaña de email ha sido enviada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la campaña de email.",
        variant: "destructive",
      });
    },
  });

  // Crear template de email
  const createEmailTemplate = useMutation({
    mutationFn: async (templateData: Omit<EmailTemplateRow, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: "Template creado",
        description: "El template de email ha sido creado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el template de email.",
        variant: "destructive",
      });
    },
  });

  // Crear campaña de SMS
  const createSmsCampaign = useMutation({
    mutationFn: async (campaignData: Omit<SmsCampaignRow, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      toast({
        title: "Campaña SMS creada",
        description: "La campaña de SMS ha sido creada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la campaña de SMS.",
        variant: "destructive",
      });
    },
  });

  // Enviar campaña de SMS
  const sendSmsCampaign = useMutation({
    mutationFn: async ({ 
      campaignId, 
      recipients, 
      message, 
      companyId 
    }: {
      campaignId: string;
      recipients: Array<{ id: string; phone: string; name?: string }>;
      message: string;
      companyId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-sms-campaign', {
        body: { campaignId, recipients, message, companyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      toast({
        title: "Campaña SMS enviada",
        description: "La campaña de SMS ha sido enviada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la campaña de SMS.",
        variant: "destructive",
      });
    },
  });

  // Enviar comunicación individual
  const sendCommunication = useMutation({
    mutationFn: async ({
      type,
      recipientId,
      recipientEmail,
      recipientPhone,
      content,
      subject
    }: {
      type: 'email' | 'sms' | 'whatsapp';
      recipientId: string;
      recipientEmail?: string;
      recipientPhone?: string;
      content: string;
      subject?: string;
    }) => {
      // Get user's company_id
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user?.id || '')
        .single();

      // Crear registro en communication_logs - use actual DB fields
      const logData = {
        channel: type, // DB uses 'channel' not 'type'
        client_id: recipientId,
        content,
        subject,
        status: 'sent',
        company_id: profile?.company_id || '',
      };

      const { data: logEntry, error: logError } = await supabase
        .from('communication_logs')
        .insert([logData])
        .select()
        .single();

      if (logError) throw logError;

      // Enviar según el tipo
      if (type === 'email') {
        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: { 
            type: 'email',
            to: recipientEmail,
            subject,
            content,
            logId: logEntry.id
          },
        });
        if (error) throw error;
        return data;
      } else if (type === 'sms' || type === 'whatsapp') {
        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: { 
            type,
            to: recipientPhone,
            content,
            logId: logEntry.id
          },
        });
        if (error) throw error;
        return data;
      }

      return logEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      toast({
        title: "Comunicación enviada",
        description: `${variables.type === 'email' ? 'Email' : variables.type === 'sms' ? 'SMS' : 'WhatsApp'} enviado exitosamente.`,
      });
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: `No se pudo enviar el ${variables.type}.`,
        variant: "destructive",
      });
    },
  });

  return {
    // Data
    emailCampaigns,
    emailTemplates,
    smsCampaigns,
    communicationLogs,

    // Loading states
    isLoadingCampaigns,
    isLoadingTemplates,
    isLoadingSmsCampaigns,
    isLoadingLogs,
    isLoading: isLoadingCampaigns || isLoadingTemplates || isLoadingSmsCampaigns || isLoadingLogs,

    // Mutations
    createEmailCampaign,
    sendEmailCampaign,
    createEmailTemplate,
    createSmsCampaign,
    sendSmsCampaign,
    sendCommunication,

    // Mutation states
    isCreatingEmailCampaign: createEmailCampaign.isPending,
    isSendingEmailCampaign: sendEmailCampaign.isPending,
    isCreatingEmailTemplate: createEmailTemplate.isPending,
    isCreatingSmsCampaign: createSmsCampaign.isPending,
    isSendingSmsCampaign: sendSmsCampaign.isPending,
  };
};
