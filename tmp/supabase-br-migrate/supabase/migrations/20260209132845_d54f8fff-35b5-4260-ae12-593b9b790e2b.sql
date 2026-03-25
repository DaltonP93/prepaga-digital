
-- Create security definer function to get user's company_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;

-- Recreate it using the security definer function
CREATE POLICY "Admins can view company profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);
