
-- Optimizar políticas RLS para mejorar rendimiento
-- Reemplazar auth.<function>() con (SELECT auth.<function>()) según recomendación del Performance Advisor

-- Actualizar políticas de profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (id = (SELECT auth.uid()));

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role)
WITH CHECK ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
FOR SELECT USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Admins can manage company profiles" ON public.profiles
FOR ALL USING (
  (SELECT get_user_role(auth.uid())) = 'admin'::user_role AND 
  company_id = (SELECT get_user_company(auth.uid()))
);

CREATE POLICY "Admins can view company profiles" ON public.profiles
FOR SELECT USING (
  (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) AND 
  company_id = (SELECT get_user_company(auth.uid()))
);

-- Actualizar políticas de companies
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

CREATE POLICY "Super admins can manage all companies" ON public.companies
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Super admins can view all companies" ON public.companies
FOR SELECT USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT USING (id = (SELECT get_user_company(auth.uid())));

-- Actualizar políticas de sales
DROP POLICY IF EXISTS "Company users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view company sales" ON public.sales;

CREATE POLICY "Company users can manage sales" ON public.sales
FOR ALL USING (
  company_id = (SELECT get_user_company(auth.uid())) OR 
  (SELECT get_user_role(auth.uid())) = 'super_admin'::user_role OR 
  ((SELECT get_user_company(auth.uid())) IS NULL AND (SELECT get_user_role(auth.uid())) IS NOT NULL)
)
WITH CHECK (
  company_id = (SELECT get_user_company(auth.uid())) OR 
  (SELECT get_user_role(auth.uid())) = 'super_admin'::user_role OR 
  ((SELECT get_user_company(auth.uid())) IS NULL AND (SELECT get_user_role(auth.uid())) IS NOT NULL)
);

CREATE POLICY "Super admins can manage all sales" ON public.sales
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company sales" ON public.sales
FOR SELECT USING (company_id = (SELECT get_user_company(auth.uid())));

-- Actualizar políticas de clients
DROP POLICY IF EXISTS "Company users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;

CREATE POLICY "Company users can manage clients" ON public.clients
FOR ALL USING (
  (SELECT get_user_role(auth.uid())) IS NOT NULL AND (
    (SELECT get_user_role(auth.uid())) = 'super_admin'::user_role OR 
    (SELECT get_user_company(auth.uid())) IS NOT NULL
  )
)
WITH CHECK (
  (SELECT get_user_role(auth.uid())) IS NOT NULL AND (
    (SELECT get_user_role(auth.uid())) = 'super_admin'::user_role OR 
    (SELECT get_user_company(auth.uid())) IS NOT NULL
  )
);

CREATE POLICY "Super admins can manage all clients" ON public.clients
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Users can view company clients" ON public.clients
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.client_id = clients.id 
    AND s.company_id = (SELECT get_user_company(auth.uid()))
  )
);

-- Actualizar políticas de templates
DROP POLICY IF EXISTS "Super admins can manage all templates" ON public.templates;
DROP POLICY IF EXISTS "Admins and gestores can manage company templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view company templates" ON public.templates;

CREATE POLICY "Super admins can manage all templates" ON public.templates
FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'super_admin'::user_role);

CREATE POLICY "Admins and gestores can manage company templates" ON public.templates
FOR ALL USING (
  (SELECT get_user_role(auth.uid())) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) AND 
  company_id = (SELECT get_user_company(auth.uid()))
);

CREATE POLICY "Users can view company templates" ON public.templates
FOR SELECT USING (company_id = (SELECT get_user_company(auth.uid())));
