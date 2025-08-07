
-- Migración completa para optimizar todas las políticas RLS problemáticas
-- Esta migración corrige el problema de auth_rls_initplan en todas las tablas

-- Optimizar políticas faltantes en plans
DROP POLICY IF EXISTS "Admins and gestores can manage company plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can manage company plans" ON public.plans;
DROP POLICY IF EXISTS "Super admins can manage all plans" ON public.plans;
DROP POLICY IF EXISTS "Users can view company plans" ON public.plans;

CREATE POLICY "Admins and gestores can manage company plans" ON public.plans
FOR ALL USING (
  (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) AND 
  company_id = (SELECT get_user_company(auth.uid()))
);

CREATE POLICY "Super admins can manage all plans" ON public.plans
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company plans" ON public.plans
FOR SELECT USING (company_id = (SELECT get_user_company(auth.uid())));

-- Optimizar políticas de documents
DROP POLICY IF EXISTS "Company users can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view company documents" ON public.documents;

CREATE POLICY "Company users can manage documents" ON public.documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = documents.sale_id 
    AND s.company_id = (SELECT get_user_company(auth.uid()))
  )
);

CREATE POLICY "Users can view company documents" ON public.documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = documents.sale_id 
    AND s.company_id = (SELECT get_user_company(auth.uid()))
  )
);

-- Optimizar políticas de signatures
DROP POLICY IF EXISTS "Users can view company signatures" ON public.signatures;

CREATE POLICY "Users can view company signatures" ON public.signatures
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = signatures.sale_id 
    AND s.company_id = (SELECT get_user_company(auth.uid()))
  )
);

-- Optimizar políticas de audit_logs
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;

CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
FOR SELECT USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Optimizar políticas de template_questions
DROP POLICY IF EXISTS "Admins and gestores can manage company template questions" ON public.template_questions;
DROP POLICY IF EXISTS "Super admins can manage all template questions" ON public.template_questions;
DROP POLICY IF EXISTS "Users can view company template questions" ON public.template_questions;

CREATE POLICY "Admins and gestores can manage company template questions" ON public.template_questions
FOR ALL USING (
  (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) AND 
  EXISTS (
    SELECT 1 FROM templates t 
    WHERE t.id = template_questions.template_id 
    AND t.company_id = (SELECT get_user_company(auth.uid()))
  )
);

CREATE POLICY "Super admins can manage all template questions" ON public.template_questions
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company template questions" ON public.template_questions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM templates t 
    WHERE t.id = template_questions.template_id 
    AND (t.company_id = (SELECT get_user_company(auth.uid())) OR t.is_global = true)
  )
);

-- Optimizar políticas de template_question_options
DROP POLICY IF EXISTS "Admins and gestores can manage question options" ON public.template_question_options;
DROP POLICY IF EXISTS "Super admins can manage all question options" ON public.template_question_options;
DROP POLICY IF EXISTS "Users can view question options" ON public.template_question_options;

CREATE POLICY "Admins and gestores can manage question options" ON public.template_question_options
FOR ALL USING (
  (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) AND 
  EXISTS (
    SELECT 1 FROM template_questions tq
    JOIN templates t ON t.id = tq.template_id
    WHERE tq.id = template_question_options.question_id 
    AND t.company_id = (SELECT get_user_company(auth.uid()))
  )
);

CREATE POLICY "Super admins can manage all question options" ON public.template_question_options
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view question options" ON public.template_question_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM template_questions tq
    JOIN templates t ON t.id = tq.template_id
    WHERE tq.id = template_question_options.question_id 
    AND (t.company_id = (SELECT get_user_company(auth.uid())) OR t.is_global = true)
  )
);

-- Optimizar políticas de template_responses
DROP POLICY IF EXISTS "Company users can manage responses" ON public.template_responses;
DROP POLICY IF EXISTS "Super admins can manage all template responses" ON public.template_responses;
DROP POLICY IF EXISTS "Users can view company template responses" ON public.template_responses;

CREATE POLICY "Company users can manage responses" ON public.template_responses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM templates t 
    WHERE t.id = template_responses.template_id 
    AND t.company_id = (SELECT get_user_company(auth.uid()))
  )
);

CREATE POLICY "Super admins can manage all template responses" ON public.template_responses
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company template responses" ON public.template_responses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM templates t 
    WHERE t.id = template_responses.template_id 
    AND t.company_id = (SELECT get_user_company(auth.uid()))
  )
);

-- Optimizar políticas de auth_attempts
DROP POLICY IF EXISTS "Super admins can view all auth attempts" ON public.auth_attempts;

CREATE POLICY "Super admins can view all auth attempts" ON public.auth_attempts
FOR SELECT USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

-- Optimizar políticas de email_campaigns
DROP POLICY IF EXISTS "Super admins can manage all campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Users can manage company campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Users can view company campaigns" ON public.email_campaigns;

CREATE POLICY "Super admins can manage all campaigns" ON public.email_campaigns
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company campaigns" ON public.email_campaigns
FOR ALL USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company campaigns" ON public.email_campaigns
FOR SELECT USING (company_id = (SELECT get_user_company(auth.uid())));

-- Optimizar políticas de email_templates
DROP POLICY IF EXISTS "Super admins can manage all email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can manage company email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can view company email templates" ON public.email_templates;

CREATE POLICY "Super admins can manage all email templates" ON public.email_templates
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company email templates" ON public.email_templates
FOR ALL USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company email templates" ON public.email_templates
FOR SELECT USING (
  company_id = (SELECT get_user_company(auth.uid())) OR is_global = true
);

-- Optimizar políticas de sms_campaigns
DROP POLICY IF EXISTS "Super admins can manage all sms campaigns" ON public.sms_campaigns;
DROP POLICY IF EXISTS "Users can manage company sms campaigns" ON public.sms_campaigns;
DROP POLICY IF EXISTS "Users can view company sms campaigns" ON public.sms_campaigns;

CREATE POLICY "Super admins can manage all sms campaigns" ON public.sms_campaigns
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company sms campaigns" ON public.sms_campaigns
FOR ALL USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company sms campaigns" ON public.sms_campaigns
FOR SELECT USING (company_id = (SELECT get_user_company(auth.uid())));

-- Optimizar políticas de communication_logs
DROP POLICY IF EXISTS "Super admins can manage all communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Users can manage company communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Users can view company communication logs" ON public.communication_logs;

CREATE POLICY "Super admins can manage all communication logs" ON public.communication_logs
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company communication logs" ON public.communication_logs
FOR ALL USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company communication logs" ON public.communication_logs
FOR SELECT USING (company_id = (SELECT get_user_company(auth.uid())));

-- Crear índices para mejorar el rendimiento de las consultas RLS
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_company_id ON public.templates(company_id);
CREATE INDEX IF NOT EXISTS idx_plans_company_id ON public.plans(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_sale_id ON public.documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_signatures_sale_id ON public.signatures(sale_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_template_id ON public.template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_responses_template_id ON public.template_responses(template_id);
