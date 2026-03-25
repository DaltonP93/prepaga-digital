
-- Enable RLS on all remaining tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_placeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_currency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_ui_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.information_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for remaining tables

-- Countries: public read access
CREATE POLICY "Anyone can view countries" ON public.countries FOR SELECT USING (true);

-- Template placeholders: public read access
CREATE POLICY "Anyone can view placeholders" ON public.template_placeholders FOR SELECT USING (true);

-- Company settings: company admins only
CREATE POLICY "Admins can manage company settings" ON public.company_settings FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')))
);

CREATE POLICY "Admins can manage currency settings" ON public.company_currency_settings FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')))
);

CREATE POLICY "Admins can manage UI settings" ON public.company_ui_settings FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')))
);

-- Template versions: through template access
CREATE POLICY "Users can view template versions" ON public.template_versions FOR SELECT USING (
    template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Template workflow states
CREATE POLICY "Users can view workflow states" ON public.template_workflow_states FOR SELECT USING (
    template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Template analytics
CREATE POLICY "Users can view template analytics" ON public.template_analytics FOR SELECT USING (
    template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Template comments
CREATE POLICY "Users can view template comments" ON public.template_comments FOR SELECT USING (
    template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can add template comments" ON public.template_comments FOR INSERT WITH CHECK (
    template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Sale templates
CREATE POLICY "Users can view sale templates" ON public.sale_templates FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can manage sale templates" ON public.sale_templates FOR ALL USING (
    sale_id IN (SELECT id FROM public.sales WHERE salesperson_id = auth.uid() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND public.has_role(auth.uid(), 'admin')))
);

-- Sale documents
CREATE POLICY "Users can view sale docs" ON public.sale_documents FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can manage sale docs" ON public.sale_documents FOR ALL USING (
    sale_id IN (SELECT id FROM public.sales WHERE salesperson_id = auth.uid())
);

-- Sale notes
CREATE POLICY "Users can view sale notes" ON public.sale_notes FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can add sale notes" ON public.sale_notes FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Sale requirements
CREATE POLICY "Users can view sale requirements" ON public.sale_requirements FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can manage sale requirements" ON public.sale_requirements FOR ALL USING (
    sale_id IN (SELECT id FROM public.sales WHERE salesperson_id = auth.uid() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND public.has_role(auth.uid(), 'admin')))
);

-- Email templates
CREATE POLICY "Users can view email templates" ON public.email_templates FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')))
);

-- Email campaigns
CREATE POLICY "Users can view email campaigns" ON public.email_campaigns FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')))
);

-- SMS campaigns
CREATE POLICY "Users can view sms campaigns" ON public.sms_campaigns FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage sms campaigns" ON public.sms_campaigns FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')))
);

-- WhatsApp notifications
CREATE POLICY "Users can view whatsapp notifications" ON public.whatsapp_notifications FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can create whatsapp notifications" ON public.whatsapp_notifications FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Communication logs
CREATE POLICY "Users can view communication logs" ON public.communication_logs FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can create communication logs" ON public.communication_logs FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Audit processes
CREATE POLICY "Users can view audit processes" ON public.audit_processes FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Admins can manage audit processes" ON public.audit_processes FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

-- Auth attempts: admin only
CREATE POLICY "Admins can view auth attempts" ON public.auth_attempts FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- File uploads
CREATE POLICY "Users can view company files" ON public.file_uploads FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can upload files" ON public.file_uploads FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Password reset tokens: user-specific
CREATE POLICY "Users can view own reset tokens" ON public.password_reset_tokens FOR SELECT USING (user_id = auth.uid());

-- Process traces
CREATE POLICY "Users can view process traces" ON public.process_traces FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can create process traces" ON public.process_traces FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Information requests
CREATE POLICY "Users can view information requests" ON public.information_requests FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can create information requests" ON public.information_requests FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Document access logs
CREATE POLICY "Admins can view doc access logs" ON public.document_access_logs FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "System can log doc access" ON public.document_access_logs FOR INSERT WITH CHECK (true);

-- Fix function search paths
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.create_template_version() SET search_path = public;

-- Drop and recreate template_responses policies with proper restrictions
DROP POLICY IF EXISTS "Anyone can insert template responses" ON public.template_responses;
CREATE POLICY "Clients can insert template responses" ON public.template_responses FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE signature_token IS NOT NULL)
);

-- Drop and recreate signatures policy
DROP POLICY IF EXISTS "Anyone can create signatures" ON public.signatures;
CREATE POLICY "Clients can create signatures via token" ON public.signatures FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE signature_token IS NOT NULL)
);

-- Drop overly permissive document_access_logs policy
DROP POLICY IF EXISTS "System can log doc access" ON public.document_access_logs;
CREATE POLICY "System can log doc access" ON public.document_access_logs FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM public.documents)
);
