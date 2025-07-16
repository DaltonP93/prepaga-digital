import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  template_id?: string;
  company_id: string;
  created_by?: string;
  status: 'draft' | 'sent' | 'scheduled';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: Record<string, any>;
  company_id: string;
  created_by?: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmssCampaign {
  id: string;
  name: string;
  message: string;
  company_id: string;
  created_by?: string;
  status: 'draft' | 'sent' | 'scheduled';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'notification';
  recipient_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  campaign_id?: string;
  subject?: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

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
      return data as EmailCampaign[];
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
      return data as EmailTemplate[];
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
      return data as SmssCampaign[];
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
      return data as CommunicationLog[];
    },
  });

  // Crear campaña de email
  const createEmailCampaign = useMutation({
    mutationFn: async (campaignData: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at'>) => {
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
    onError: (error) => {
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo enviar la campaña de email.",
        variant: "destructive",
      });
    },
  });

  // Crear template de email
  const createEmailTemplate = useMutation({
    mutationFn: async (templateData: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el template de email.",
        variant: "destructive",
      });
    },
  });

  // Crear campaña de SMS
  const createSmsCampaign = useMutation({
    mutationFn: async (campaignData: Omit<SmssCampaign, 'id' | 'created_at' | 'updated_at'>) => {
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
    onError: (error) => {
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo enviar la campaña de SMS.",
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

    // Mutations
    createEmailCampaign,
    sendEmailCampaign,
    createEmailTemplate,
    createSmsCampaign,
    sendSmsCampaign,

    // Mutation states
    isCreatingEmailCampaign: createEmailCampaign.isPending,
    isSendingEmailCampaign: sendEmailCampaign.isPending,
    isCreatingEmailTemplate: createEmailTemplate.isPending,
    isCreatingSmsCampaign: createSmsCampaign.isPending,
    isSendingSmsCampaign: sendSmsCampaign.isPending,
  };
};