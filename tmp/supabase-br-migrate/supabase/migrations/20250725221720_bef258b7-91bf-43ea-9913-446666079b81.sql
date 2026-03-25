
-- Actualizar políticas RLS para permitir operaciones sin company_id

-- Actualizar política de profiles para permitir a super_admin crear usuarios sin company_id
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" 
  ON public.profiles 
  FOR ALL 
  USING (get_user_role(auth.uid()) = 'super_admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Actualizar política de beneficiaries para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Company users can manage beneficiaries" ON public.beneficiaries;
CREATE POLICY "Company users can manage beneficiaries" 
  ON public.beneficiaries 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = beneficiaries.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = beneficiaries.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  );

-- Actualizar política de sale_documents para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Company users can manage sale documents" ON public.sale_documents;
CREATE POLICY "Company users can manage sale documents" 
  ON public.sale_documents 
  FOR ALL 
  USING (
    uploaded_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = sale_documents.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = sale_documents.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  );

-- Actualizar política de sale_notes para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Company users can manage sale notes" ON public.sale_notes;
CREATE POLICY "Company users can manage sale notes" 
  ON public.sale_notes 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = sale_notes.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = sale_notes.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  );

-- Actualizar política de sale_requirements para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Company users can manage sale requirements" ON public.sale_requirements;
CREATE POLICY "Company users can manage sale requirements" 
  ON public.sale_requirements 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = sale_requirements.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = sale_requirements.sale_id 
      AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::user_role)
    )
  );

-- Actualizar política de sales para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Company users can manage sales" ON public.sales;
CREATE POLICY "Company users can manage sales" 
  ON public.sales 
  FOR ALL 
  USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'super_admin'::user_role OR
    (get_user_company(auth.uid()) IS NULL AND get_user_role(auth.uid()) IS NOT NULL)
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'super_admin'::user_role OR
    (get_user_company(auth.uid()) IS NULL AND get_user_role(auth.uid()) IS NOT NULL)
  );

-- Actualizar política de clients para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Company users can manage clients" ON public.clients;
CREATE POLICY "Company users can manage clients" 
  ON public.clients 
  FOR ALL 
  USING (
    get_user_role(auth.uid()) IS NOT NULL AND 
    (get_user_role(auth.uid()) = 'super_admin'::user_role OR get_user_company(auth.uid()) IS NOT NULL)
  )
  WITH CHECK (
    get_user_role(auth.uid()) IS NOT NULL AND 
    (get_user_role(auth.uid()) = 'super_admin'::user_role OR get_user_company(auth.uid()) IS NOT NULL)
  );

-- Actualizar política de plans para permitir operaciones sin company_id
DROP POLICY IF EXISTS "Users can view company plans" ON public.plans;
CREATE POLICY "Users can view company plans" 
  ON public.plans 
  FOR SELECT 
  USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'super_admin'::user_role OR
    (get_user_company(auth.uid()) IS NULL AND get_user_role(auth.uid()) IS NOT NULL)
  );
