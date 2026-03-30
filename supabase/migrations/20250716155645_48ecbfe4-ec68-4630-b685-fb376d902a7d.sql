-- Crear tablas para el sistema de comunicación
CREATE TABLE public.email_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    content TEXT NOT NULL,
    template_id UUID,
    company_id UUID,
    created_by UUID,
    status VARCHAR NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    company_id UUID,
    created_by UUID,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sms_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    message TEXT NOT NULL,
    company_id UUID,
    created_by UUID,
    status VARCHAR NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.communication_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR NOT NULL, -- email, sms, whatsapp, notification
    recipient_id UUID,
    recipient_email VARCHAR,
    recipient_phone VARCHAR,
    campaign_id UUID,
    subject VARCHAR,
    content TEXT NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para email_campaigns
CREATE POLICY "Users can view company campaigns" 
ON public.email_campaigns FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company campaigns" 
ON public.email_campaigns FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all campaigns" 
ON public.email_campaigns FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

-- Políticas para email_templates
CREATE POLICY "Users can view company templates" 
ON public.email_templates FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR is_global = true);

CREATE POLICY "Users can manage company templates" 
ON public.email_templates FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all templates" 
ON public.email_templates FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

-- Políticas para sms_campaigns
CREATE POLICY "Users can view company sms campaigns" 
ON public.sms_campaigns FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company sms campaigns" 
ON public.sms_campaigns FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all sms campaigns" 
ON public.sms_campaigns FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

-- Políticas para communication_logs
CREATE POLICY "Users can view company communication logs" 
ON public.communication_logs FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company communication logs" 
ON public.communication_logs FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all communication logs" 
ON public.communication_logs FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

-- Triggers para updated_at
CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sms_campaigns_updated_at
BEFORE UPDATE ON public.sms_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_communication_logs_updated_at
BEFORE UPDATE ON public.communication_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();