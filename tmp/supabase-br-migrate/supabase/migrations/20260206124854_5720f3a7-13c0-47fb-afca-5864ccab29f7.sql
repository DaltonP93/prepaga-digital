-- Fix the signature_links RLS policy that exposes all records to anonymous users
-- This is a CRITICAL security fix - the current policy USING(true) allows anyone to query ALL signature links

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view signature links by token" ON public.signature_links;

-- Create a secure policy that only allows access when the token matches a query parameter
-- The client must pass the token as a query parameter which Supabase exposes via request headers
-- For anonymous access, we'll use a custom header 'x-signature-token' that the client must provide
CREATE POLICY "Public can view signature link by token"
  ON public.signature_links
  FOR SELECT
  TO anon
  USING (
    -- Only allow access if the token in the row matches the token provided in request header
    token = COALESCE(
      current_setting('request.headers', true)::json->>'x-signature-token',
      ''
    )
  );

-- Also add a policy for public UPDATE to mark signature as completed (only for the specific token)
DROP POLICY IF EXISTS "Public can update signature links by token" ON public.signature_links;
CREATE POLICY "Public can update signature link by token"
  ON public.signature_links
  FOR UPDATE
  TO anon
  USING (
    token = COALESCE(
      current_setting('request.headers', true)::json->>'x-signature-token',
      ''
    )
  )
  WITH CHECK (
    token = COALESCE(
      current_setting('request.headers', true)::json->>'x-signature-token',
      ''
    )
  );