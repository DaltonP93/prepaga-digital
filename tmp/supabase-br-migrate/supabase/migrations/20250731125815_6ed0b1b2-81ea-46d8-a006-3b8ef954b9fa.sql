
-- Optimize RLS policies to prevent re-evaluation of auth functions for better performance

-- Fix companies table policies
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

CREATE POLICY "Super admins can manage all companies" ON public.companies
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Super admins can view all companies" ON public.companies
FOR SELECT TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING (id = (SELECT get_user_company(auth.uid())));

-- Fix profiles table policies
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can manage company profiles" ON public.profiles
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) = 'admin'::user_role) AND (company_id = (SELECT get_user_company(auth.uid()))));

CREATE POLICY "Admins can view company profiles" ON public.profiles
FOR SELECT TO authenticated
USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role])) AND (company_id = (SELECT get_user_company(auth.uid()))));

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)
WITH CHECK ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- Fix audit_logs table policies
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;

CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Fix auth_attempts table policies
DROP POLICY IF EXISTS "Super admins can view all auth attempts" ON public.auth_attempts;

CREATE POLICY "Super admins can view all auth attempts" ON public.auth_attempts
FOR SELECT TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

-- Fix sales table policies
DROP POLICY IF EXISTS "Company users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view company sales" ON public.sales;

CREATE POLICY "Company users can manage sales" ON public.sales
FOR ALL TO authenticated
USING ((company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role) OR (((SELECT get_user_company(auth.uid())) IS NULL) AND ((SELECT get_user_role(auth.uid())) IS NOT NULL)))
WITH CHECK ((company_id = (SELECT get_user_company(auth.uid()))) OR ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role) OR (((SELECT get_user_company(auth.uid())) IS NULL) AND ((SELECT get_user_role(auth.uid())) IS NOT NULL)));

CREATE POLICY "Super admins can manage all sales" ON public.sales
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company sales" ON public.sales
FOR SELECT TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

-- Fix clients table policies
DROP POLICY IF EXISTS "Company users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins can manage all clients" ON public.clients;

CREATE POLICY "Company users can manage clients" ON public.clients
FOR ALL TO authenticated
USING (((SELECT get_user_role(auth.uid())) IS NOT NULL) AND (((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role) OR ((SELECT get_user_company(auth.uid())) IS NOT NULL)))
WITH CHECK (((SELECT get_user_role(auth.uid())) IS NOT NULL) AND (((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role) OR ((SELECT get_user_company(auth.uid())) IS NOT NULL)));

CREATE POLICY "Super admins can manage all clients" ON public.clients
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

-- Fix communication_logs table policies
DROP POLICY IF EXISTS "Super admins can manage all communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Users can manage company communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Users can view company communication logs" ON public.communication_logs;

CREATE POLICY "Super admins can manage all communication logs" ON public.communication_logs
FOR ALL TO authenticated
USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can manage company communication logs" ON public.communication_logs
FOR ALL TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

CREATE POLICY "Users can view company communication logs" ON public.communication_logs
FOR SELECT TO authenticated
USING (company_id = (SELECT get_user_company(auth.uid())));

-- Fix company_settings table policies
DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;

CREATE POLICY "Admins can manage company settings" ON public.company_settings
FOR ALL TO authenticated
USING ((company_id = (SELECT get_user_company(auth.uid()))) AND ((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))
WITH CHECK ((company_id = (SELECT get_user_company(auth.uid()))) AND ((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])));

-- Fix dashboard_widgets table policies
DROP POLICY IF EXISTS "Users can manage their own dashboard widgets" ON public.dashboard_widgets;

CREATE POLICY "Users can manage their own dashboard widgets" ON public.dashboard_widgets
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Fix notifications table policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Fix file_uploads table policies
DROP POLICY IF EXISTS "Users can manage their own uploads" ON public.file_uploads;

CREATE POLICY "Users can manage their own uploads" ON public.file_uploads
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Fix password_reset_tokens table policies
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public.password_reset_tokens;

CREATE POLICY "Users can view their own reset tokens" ON public.password_reset_tokens
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
