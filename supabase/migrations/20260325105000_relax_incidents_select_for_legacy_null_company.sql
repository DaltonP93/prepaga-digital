DROP POLICY IF EXISTS incidents_select ON public.incidents;

CREATE POLICY incidents_select
ON public.incidents
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR company_id IS NULL
);
