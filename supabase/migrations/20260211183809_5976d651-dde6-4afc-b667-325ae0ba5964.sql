-- Fix: Allow any user from the same company to manage sale_documents (not just salesperson)
DROP POLICY IF EXISTS "Users can manage sale docs" ON public.sale_documents;

CREATE POLICY "Users can manage sale docs" 
ON public.sale_documents 
FOR ALL
USING (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE (
      s.salesperson_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR has_role(auth.uid(), 'auditor'::app_role)
      OR (s.company_id IN (
        SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
      ))
    )
  )
)
WITH CHECK (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE (
      s.salesperson_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR has_role(auth.uid(), 'auditor'::app_role)
      OR (s.company_id IN (
        SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
      ))
    )
  )
);