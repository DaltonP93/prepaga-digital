
-- Fix 1: Cross-tenant access on companies table for admin role
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;

CREATE POLICY "Admins can manage companies" ON public.companies
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND id = public.get_user_company_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND id = public.get_user_company_id(auth.uid()))
);

-- Fix 2: Cross-tenant access on plans table for admin role
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;

CREATE POLICY "Admins can manage plans" ON public.plans
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND company_id = public.get_user_company_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND company_id = public.get_user_company_id(auth.uid()))
);

-- Fix 3: Add storage policies for company-assets bucket (restrict writes to admins)
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

CREATE POLICY "Admins can upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  )
);

CREATE POLICY "Admins can update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  )
);

CREATE POLICY "Admins can delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  )
);
