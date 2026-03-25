-- Fix: Allow auditor and supervisor roles to update sales (needed for audit approve/reject/request info)
DROP POLICY IF EXISTS "Users can manage own sales" ON public.sales;

CREATE POLICY "Users can manage own sales" 
ON public.sales 
FOR ALL
USING (
  (salesperson_id = auth.uid()) 
  OR has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
);

-- Also allow auditor to insert into sale_workflow_states
DROP POLICY IF EXISTS "Users can create sale workflow states" ON public.sale_workflow_states;

CREATE POLICY "Users can create sale workflow states" 
ON public.sale_workflow_states 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = sale_workflow_states.sale_id
    AND (
      s.salesperson_id = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'auditor'::app_role)
      OR has_role(auth.uid(), 'supervisor'::app_role)
    )
  )
);

-- Allow auditor to insert notifications for the vendedor
DROP POLICY IF EXISTS "audit_insert_notifications" ON public.notifications;

CREATE POLICY "audit_insert_notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'auditor'::app_role) 
  OR has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
);

-- Allow auditor to update information_requests
DROP POLICY IF EXISTS "Users can update information requests" ON public.information_requests;

CREATE POLICY "Users can update information requests"
ON public.information_requests
FOR UPDATE
USING (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE s.company_id IN (
      SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
);