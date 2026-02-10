-- Allow super_admin to see all data across companies
-- This fixes the issue where super_admin (with company_id = NULL) cannot see any data

-- ============================================
-- CLIENTS: Add super_admin bypass
-- ============================================
DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;
CREATE POLICY "Users can view company clients" ON public.clients FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage company clients" ON public.clients;
CREATE POLICY "Users can manage company clients" ON public.clients FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- PLANS: Add super_admin bypass to SELECT
-- ============================================
DROP POLICY IF EXISTS "Users can view company plans" ON public.plans;
CREATE POLICY "Users can view company plans" ON public.plans FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- SALES: Add super_admin bypass to SELECT
-- ============================================
DROP POLICY IF EXISTS "Users can view company sales" ON public.sales;
CREATE POLICY "Users can view company sales" ON public.sales FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- DOCUMENTS: Add super_admin bypass
-- ============================================
DROP POLICY IF EXISTS "Users can view sale documents" ON public.documents;
CREATE POLICY "Users can view sale documents" ON public.documents FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can manage sale documents" ON public.documents;
CREATE POLICY "Users can manage sale documents" ON public.documents FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    sale_id IN (SELECT id FROM public.sales WHERE salesperson_id = auth.uid())
);
