-- Add policy for admins to view profiles within their company
CREATE POLICY "Admins can view company profiles"
ON public.profiles
FOR SELECT
USING (
  -- Owner can always see their own profile (already covered, but included for completeness)
  auth.uid() = id
  OR
  -- Admins/super_admins can see profiles in their company
  (
    company_id IN (
      SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Add policy for super_admins to view ALL profiles (cross-company)
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);