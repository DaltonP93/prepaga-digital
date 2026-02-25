-- Security hardening for scanner findings:
-- 1) Tighten profiles visibility to least-privilege roles.
-- 2) Harden anonymous signature_links access and remove sensitive column exposure.

-- Ensure helper exists (avoids recursive profile lookups in policies).
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

-- ============================================
-- PROFILES: least privilege + explicit target role
-- ============================================

REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Privileged users can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id((SELECT auth.uid()))
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::app_role)
    OR public.has_role((SELECT auth.uid()), 'supervisor'::app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::app_role)
  )
);

CREATE POLICY "Admins can manage company profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id((SELECT auth.uid()))
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::app_role)
  )
)
WITH CHECK (
  company_id = public.get_user_company_id((SELECT auth.uid()))
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::app_role)
  )
);

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'super_admin'::app_role))
WITH CHECK (public.has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ============================================
-- SIGNATURE_LINKS: harden anonymous access
-- ============================================

-- Remove old/publicly broad policies from previous migrations.
DROP POLICY IF EXISTS "Public can view signature links by token" ON public.signature_links;
DROP POLICY IF EXISTS "Public can view signature link by token" ON public.signature_links;
DROP POLICY IF EXISTS "Public can update signature links by token" ON public.signature_links;
DROP POLICY IF EXISTS "Public can update signature link by token" ON public.signature_links;

-- Minimize anon privileges at column level.
REVOKE ALL ON public.signature_links FROM anon;

GRANT SELECT (
  id,
  sale_id,
  package_id,
  recipient_type,
  recipient_id,
  expires_at,
  accessed_at,
  access_count,
  status,
  completed_at,
  created_at,
  updated_at,
  signwell_signing_url
) ON public.signature_links TO anon;

GRANT UPDATE (
  status,
  completed_at,
  accessed_at,
  access_count,
  updated_at
) ON public.signature_links TO anon;

-- Anonymous users can only read the exact row referenced by a valid token header.
CREATE POLICY "Public can view signature link by validated token"
ON public.signature_links
FOR SELECT
TO anon
USING (
  id = public.get_signature_link_id_from_token()
  AND expires_at > now()
  AND status <> 'revocado'
);

-- Anonymous users can only update that same validated row.
CREATE POLICY "Public can update signature link by validated token"
ON public.signature_links
FOR UPDATE
TO anon
USING (
  id = public.get_signature_link_id_from_token()
  AND token = COALESCE(current_setting('request.headers', true)::json->>'x-signature-token', '')
  AND expires_at > now()
  AND status <> 'revocado'
)
WITH CHECK (
  id = public.get_signature_link_id_from_token()
  AND token = COALESCE(current_setting('request.headers', true)::json->>'x-signature-token', '')
  AND expires_at > now()
  AND status IN ('pendiente', 'enviado', 'firmado_parcial', 'completado')
);
