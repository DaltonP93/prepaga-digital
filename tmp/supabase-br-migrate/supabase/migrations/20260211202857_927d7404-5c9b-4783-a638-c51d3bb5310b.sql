
-- Helper function: given a signature token in the request header, return the sale_id
-- This is used by RLS policies to grant public access to related tables
CREATE OR REPLACE FUNCTION public.get_sale_id_from_signature_token()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT sale_id
  FROM public.signature_links
  WHERE token = COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-signature-token'),
    ''
  )
  AND expires_at > now()
  AND status != 'revocado'
  LIMIT 1
$$;

-- Helper function: get signature_link_id from token
CREATE OR REPLACE FUNCTION public.get_signature_link_id_from_token()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id
  FROM public.signature_links
  WHERE token = COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-signature-token'),
    ''
  )
  AND expires_at > now()
  AND status != 'revocado'
  LIMIT 1
$$;

-- 1. SALES: Public SELECT by token
CREATE POLICY "Public can view sale by signature token"
ON public.sales
FOR SELECT
USING (id = public.get_sale_id_from_signature_token());

-- 2. CLIENTS: Public SELECT for the client of the sale
CREATE POLICY "Public can view client by signature token"
ON public.clients
FOR SELECT
USING (id IN (
  SELECT client_id FROM public.sales WHERE id = public.get_sale_id_from_signature_token()
));

-- 3. PLANS: Public SELECT for the plan of the sale
CREATE POLICY "Public can view plan by signature token"
ON public.plans
FOR SELECT
USING (id IN (
  SELECT plan_id FROM public.sales WHERE id = public.get_sale_id_from_signature_token()
));

-- 4. COMPANIES: Public SELECT for the company of the sale
CREATE POLICY "Public can view company by signature token"
ON public.companies
FOR SELECT
USING (id IN (
  SELECT company_id FROM public.sales WHERE id = public.get_sale_id_from_signature_token()
));

-- 5. BENEFICIARIES: Public SELECT for beneficiaries of the sale
CREATE POLICY "Public can view beneficiaries by signature token"
ON public.beneficiaries
FOR SELECT
USING (sale_id = public.get_sale_id_from_signature_token());

-- 6. DOCUMENTS: Public SELECT for documents of the sale
CREATE POLICY "Public can view documents by signature token"
ON public.documents
FOR SELECT
USING (sale_id = public.get_sale_id_from_signature_token());

-- 7. DOCUMENTS: Public INSERT for saving signature document
CREATE POLICY "Public can insert signature document by token"
ON public.documents
FOR INSERT
WITH CHECK (sale_id = public.get_sale_id_from_signature_token());

-- 8. PROCESS_TRACES: Public INSERT for audit trail
CREATE POLICY "Public can insert process trace by signature token"
ON public.process_traces
FOR INSERT
WITH CHECK (sale_id = public.get_sale_id_from_signature_token());

-- 9. SIGNATURE_WORKFLOW_STEPS: Public INSERT for logging steps
CREATE POLICY "Public can insert workflow step by signature token"
ON public.signature_workflow_steps
FOR INSERT
WITH CHECK (signature_link_id = public.get_signature_link_id_from_token());

-- 10. SIGNATURE_WORKFLOW_STEPS: Public SELECT for reading existing steps
CREATE POLICY "Public can view workflow steps by signature token"
ON public.signature_workflow_steps
FOR SELECT
USING (signature_link_id = public.get_signature_link_id_from_token());
