
-- Optimize remaining RLS policies to prevent re-evaluation of auth functions for better performance

-- Fix plans table policies
DROP POLICY IF EXISTS "Admins and gestores can manage company plans" ON public.plans;
DROP POLICY IF EXISTS "Users can view company plans" ON public.plans;
DROP POLICY IF EXISTS "Super admins can manage all plans" ON public.plans;

CREATE POLICY "Admins and gestores can manage company plans" ON public.plans
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (company_id = (SELECT get_user_company(auth.uid()))));

CREATE POLICY "Users can view company plans" ON public.plans
FOR SELECT TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Super admins can manage all plans" ON public.plans
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

-- Fix clients table policies (remaining one)
DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;

CREATE POLICY "Users can view company clients" ON public.clients
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.client_id = clients.id) AND (s.company_id = (SELECT get_user_company(auth.uid()))))));

-- Fix documents table policies
DROP POLICY IF EXISTS "Company users can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view company documents" ON public.documents;

CREATE POLICY "Company users can manage documents" ON public.documents
FOR ALL TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = documents.sale_id) AND (s.company_id = (SELECT get_user_company(auth.uid()))))));

CREATE POLICY "Users can view company documents" ON public.documents
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = documents.sale_id) AND (s.company_id = (SELECT get_user_company(auth.uid()))))));

-- Fix signatures table policies
DROP POLICY IF EXISTS "Users can view company signatures" ON public.signatures;

CREATE POLICY "Users can view company signatures" ON public.signatures
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = signatures.sale_id) AND (s.company_id = (SELECT get_user_company(auth.uid()))))));

-- Fix template_questions table policies
DROP POLICY IF EXISTS "Admins and gestores can manage company template questions" ON public.template_questions;
DROP POLICY IF EXISTS "Super admins can manage all template questions" ON public.template_questions;
DROP POLICY IF EXISTS "Users can view company template questions" ON public.template_questions;

CREATE POLICY "Admins and gestores can manage company template questions" ON public.template_questions
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_questions.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid())))))));

CREATE POLICY "Super admins can manage all template questions" ON public.template_questions
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company template questions" ON public.template_questions
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_questions.template_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true)))));

-- Fix template_question_options table policies
DROP POLICY IF EXISTS "Admins and gestores can manage question options" ON public.template_question_options;
DROP POLICY IF EXISTS "Super admins can manage all question options" ON public.template_question_options;
DROP POLICY IF EXISTS "Users can view question options" ON public.template_question_options;

CREATE POLICY "Admins and gestores can manage question options" ON public.template_question_options
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (EXISTS ( SELECT 1
   FROM (template_questions tq
     JOIN templates t ON ((t.id = tq.template_id)))
  WHERE ((tq.id = template_question_options.question_id) AND (t.company_id = (SELECT get_user_company(auth.uid())))))));

CREATE POLICY "Super admins can manage all question options" ON public.template_question_options
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view question options" ON public.template_question_options
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM (template_questions tq
     JOIN templates t ON ((t.id = tq.template_id)))
  WHERE ((tq.id = template_question_options.question_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true)))));

-- Fix template_responses table policies
DROP POLICY IF EXISTS "Company users can manage responses" ON public.template_responses;
DROP POLICY IF EXISTS "Super admins can manage all template responses" ON public.template_responses;
DROP POLICY IF EXISTS "Users can view company template responses" ON public.template_responses;

CREATE POLICY "Company users can manage responses" ON public.template_responses
FOR ALL TO authenticated
USING (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_responses.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid()))))));

CREATE POLICY "Super admins can manage all template responses" ON public.template_responses
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company template responses" ON public.template_responses
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_responses.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid()))))));

-- Fix template_workflow_states table policies
DROP POLICY IF EXISTS "Admins can manage company template workflow states" ON public.template_workflow_states;
DROP POLICY IF EXISTS "Super admins can manage all template workflow states" ON public.template_workflow_states;
DROP POLICY IF EXISTS "Users can view company template workflow states" ON public.template_workflow_states;

CREATE POLICY "Admins can manage company template workflow states" ON public.template_workflow_states
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_workflow_states.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid())))))));

CREATE POLICY "Super admins can manage all template workflow states" ON public.template_workflow_states
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company template workflow states" ON public.template_workflow_states
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_workflow_states.template_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true)))));

-- Fix template_comments table policies
DROP POLICY IF EXISTS "Admins can manage company template comments" ON public.template_comments;
DROP POLICY IF EXISTS "Users can create comments on company templates" ON public.template_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.template_comments;
DROP POLICY IF EXISTS "Users can view company template comments" ON public.template_comments;

CREATE POLICY "Admins can manage company template comments" ON public.template_comments
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_comments.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid())))))));

CREATE POLICY "Users can create comments on company templates" ON public.template_comments
FOR INSERT TO authenticated
WITH CHECK ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_comments.template_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true))))));

CREATE POLICY "Users can update their own comments" ON public.template_comments
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view company template comments" ON public.template_comments
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_comments.template_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true)))));

-- Fix template_versions table policies (if they exist)
DROP POLICY IF EXISTS "Users can view company template versions" ON public.template_versions;
DROP POLICY IF EXISTS "Admins can manage company template versions" ON public.template_versions;

CREATE POLICY "Users can view company template versions" ON public.template_versions
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_versions.template_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true)))));

CREATE POLICY "Admins can manage company template versions" ON public.template_versions
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_versions.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid())))))));

-- Fix template_analytics table policies
DROP POLICY IF EXISTS "Admins can view company template analytics" ON public.template_analytics;
DROP POLICY IF EXISTS "Users can create analytics for company templates" ON public.template_analytics;

CREATE POLICY "Admins can view company template analytics" ON public.template_analytics
FOR SELECT TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_analytics.template_id) AND (t.company_id = (SELECT get_user_company(auth.uid())))))));

CREATE POLICY "Users can create analytics for company templates" ON public.template_analytics
FOR INSERT TO authenticated
WITH CHECK (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_analytics.template_id) AND ((t.company_id = (SELECT get_user_company(auth.uid()))) OR (t.is_global = true)))));

-- Fix document_access_logs table policies
DROP POLICY IF EXISTS "Company users can view access logs" ON public.document_access_logs;

CREATE POLICY "Company users can view access logs" ON public.document_access_logs
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1
   FROM (documents d
     JOIN sales s ON ((d.sale_id = s.id)))
  WHERE ((d.id = document_access_logs.document_id) AND (s.company_id = (SELECT get_user_company(auth.uid()))))));

-- Fix beneficiaries table policies
DROP POLICY IF EXISTS "Company users can manage beneficiaries" ON public.beneficiaries;

CREATE POLICY "Company users can manage beneficiaries" ON public.beneficiaries
FOR ALL TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = beneficiaries.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)))))
WITH CHECK (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = beneficiaries.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)))));

-- Fix sale_documents table policies
DROP POLICY IF EXISTS "Company users can manage sale documents" ON public.sale_documents;

CREATE POLICY "Company users can manage sale documents" ON public.sale_documents
FOR ALL TO authenticated
USING ((uploaded_by = (SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_documents.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role))))))
WITH CHECK ((uploaded_by = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_documents.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role))))));

-- Fix sale_notes table policies
DROP POLICY IF EXISTS "Company users can manage sale notes" ON public.sale_notes;

CREATE POLICY "Company users can manage sale notes" ON public.sale_notes
FOR ALL TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_notes.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)))))
WITH CHECK (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_notes.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)))));

-- Fix sale_requirements table policies
DROP POLICY IF EXISTS "Company users can manage sale requirements" ON public.sale_requirements;

CREATE POLICY "Company users can manage sale requirements" ON public.sale_requirements
FOR ALL TO authenticated
USING (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_requirements.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)))))
WITH CHECK (EXISTS ( SELECT 1
   FROM sales s
  WHERE ((s.id = sale_requirements.sale_id) AND ((s.company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)))));

-- Fix templates table policies
DROP POLICY IF EXISTS "Admins and gestores can manage company templates" ON public.templates;
DROP POLICY IF EXISTS "Super admins can manage all templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view company templates" ON public.templates;

CREATE POLICY "Admins and gestores can manage company templates" ON public.templates
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (company_id = (SELECT get_user_company(auth.uid()))));

CREATE POLICY "Super admins can manage all templates" ON public.templates
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company templates" ON public.templates
FOR SELECT TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

-- Fix email_campaigns table policies
DROP POLICY IF EXISTS "Super admins can manage all campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Users can manage company campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Users can view company campaigns" ON public.email_campaigns;

CREATE POLICY "Super admins can manage all campaigns" ON public.email_campaigns
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company campaigns" ON public.email_campaigns
FOR ALL TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company campaigns" ON public.email_campaigns
FOR SELECT TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

-- Fix email_templates table policies
DROP POLICY IF EXISTS "Super admins can manage all templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can manage company templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can view company templates" ON public.email_templates;

CREATE POLICY "Super admins can manage all email templates" ON public.email_templates
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company email templates" ON public.email_templates
FOR ALL TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company email templates" ON public.email_templates
FOR SELECT TO authenticated
USING ((company_id = (SELECT get_user_company(auth.uid()))) OR (is_global = true));

-- Fix sms_campaigns table policies (if they exist)
DROP POLICY IF EXISTS "Super admins can manage all sms campaigns" ON public.sms_campaigns;
DROP POLICY IF EXISTS "Users can manage company sms campaigns" ON public.sms_campaigns;
DROP POLICY IF EXISTS "Users can view company sms campaigns" ON public.sms_campaigns;

CREATE POLICY "Super admins can manage all sms campaigns" ON public.sms_campaigns
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company sms campaigns" ON public.sms_campaigns
FOR ALL TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company sms campaigns" ON public.sms_campaigns
FOR SELECT TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

-- Fix template_placeholders table policies
DROP POLICY IF EXISTS "Admins and gestores can manage placeholders" ON public.template_placeholders;

CREATE POLICY "Admins and gestores can manage placeholders" ON public.template_placeholders
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'gestor'::user_role]));
