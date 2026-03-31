-- Fix function search_path mutable warning
CREATE OR REPLACE FUNCTION public.handle_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix RLS enabled no policy: rate_limit_log is managed by security definer functions only
-- Add a restrictive policy so no direct client access is possible
CREATE POLICY "No direct access to rate_limit_log"
ON public.rate_limit_log
FOR ALL
TO public
USING (false);