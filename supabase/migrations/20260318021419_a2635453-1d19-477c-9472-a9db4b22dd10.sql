
-- Fix incident_attachments SELECT policy
DROP POLICY IF EXISTS incident_attachments_select ON incident_attachments;
CREATE POLICY incident_attachments_select ON incident_attachments
  FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = get_user_company_id(auth.uid())
    )
  );

-- Fix incident_attachments INSERT policy
DROP POLICY IF EXISTS incident_attachments_insert ON incident_attachments;
CREATE POLICY incident_attachments_insert ON incident_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = get_user_company_id(auth.uid())
    )
  );

-- Fix incident_comments SELECT policy
DROP POLICY IF EXISTS incident_comments_select ON incident_comments;
CREATE POLICY incident_comments_select ON incident_comments
  FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM incidents
      WHERE company_id = get_user_company_id(auth.uid())
    )
  );

-- Restrict OTP policy SELECT to admin roles only
DROP POLICY IF EXISTS "Users can read own company OTP policy" ON company_otp_policy;
CREATE POLICY "Admins can read OTP policy" ON company_otp_policy
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  );
