-- Remove the RLS policy that exposes API credentials to signature token holders
-- The public signature flow uses company_settings_public view instead
DROP POLICY IF EXISTS "Public can read non-sensitive company_settings via signature token" ON public.company_settings;