
-- Drop existing policies on sale_templates
DROP POLICY IF EXISTS "Users can manage sale templates" ON public.sale_templates;
DROP POLICY IF EXISTS "Users can view sale templates" ON public.sale_templates;

-- Recreate ALL policy with proper WITH CHECK for company users
CREATE POLICY "Users can manage sale templates"
ON public.sale_templates
FOR ALL
TO authenticated
USING (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE s.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
)
WITH CHECK (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE s.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
);
