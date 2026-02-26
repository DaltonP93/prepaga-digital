-- Fix: Replace overly permissive public INSERT policies on template_responses and signatures
-- with token-validated policies for security

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert template responses" ON public.template_responses;
DROP POLICY IF EXISTS "Anyone can create signatures" ON public.signatures;

-- Add authenticated user policy for template_responses
CREATE POLICY "Authenticated users can insert template responses"
ON public.template_responses
FOR INSERT
TO authenticated
WITH CHECK (
  sale_id IN (
    SELECT id FROM public.sales
    WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Add signature token policy for anonymous template response insertion
CREATE POLICY "Public can insert responses via signature token"
ON public.template_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (
  sale_id = public.get_sale_id_from_signature_token()
);

-- Add authenticated user policy for signatures
CREATE POLICY "Authenticated users can create signatures"
ON public.signatures
FOR INSERT
TO authenticated
WITH CHECK (
  sale_id IN (
    SELECT id FROM public.sales
    WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Add signature token policy for anonymous signature creation
CREATE POLICY "Public can create signatures via signature token"
ON public.signatures
FOR INSERT
TO anon, authenticated
WITH CHECK (
  sale_id = public.get_sale_id_from_signature_token()
);