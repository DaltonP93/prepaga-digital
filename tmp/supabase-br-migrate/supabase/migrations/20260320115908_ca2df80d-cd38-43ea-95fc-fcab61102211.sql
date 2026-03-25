-- Allow admins and super admins to update managed profiles safely
CREATE POLICY "Admins can update company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id(auth.uid())
  )
);