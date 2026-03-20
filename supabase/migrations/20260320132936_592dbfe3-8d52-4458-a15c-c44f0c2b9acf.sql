-- Insert super_admin role for dalton9302@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('a91bd9e9-3965-4836-9a19-575baec01dcf', 'super_admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Recreate RLS policy to ensure all operations work
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role) 
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role) 
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);