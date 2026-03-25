-- Add INSERT policy for template_versions so the trigger can create versions
CREATE POLICY "Users can insert template versions"
ON public.template_versions
FOR INSERT
WITH CHECK (
  template_id IN (
    SELECT t.id FROM templates t
    WHERE t.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
);
