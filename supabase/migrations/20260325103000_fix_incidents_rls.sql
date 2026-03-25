ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incidents_select ON public.incidents;
CREATE POLICY incidents_select
ON public.incidents
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS incidents_insert ON public.incidents;
CREATE POLICY incidents_insert
ON public.incidents
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND reported_by = auth.uid()
);

DROP POLICY IF EXISTS incidents_update ON public.incidents;
CREATE POLICY incidents_update
ON public.incidents
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS incidents_delete ON public.incidents;
CREATE POLICY incidents_delete
ON public.incidents
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);
