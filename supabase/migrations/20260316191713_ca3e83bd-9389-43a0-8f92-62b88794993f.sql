DROP POLICY IF EXISTS "Users can upload files" ON file_uploads;

CREATE POLICY "Users can upload files"
ON file_uploads
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    company_id IS NULL
    OR company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
);