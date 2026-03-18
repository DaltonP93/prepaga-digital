CREATE POLICY "Public can read company_settings via signature token"
ON public.company_settings
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.sales
    WHERE id = public.get_sale_id_from_signature_token()
  )
);