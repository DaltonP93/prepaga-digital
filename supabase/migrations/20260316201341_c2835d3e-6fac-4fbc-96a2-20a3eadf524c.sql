
DROP POLICY IF EXISTS "Users can upload files" ON file_uploads;

CREATE POLICY "Users can upload files"
ON file_uploads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
);
