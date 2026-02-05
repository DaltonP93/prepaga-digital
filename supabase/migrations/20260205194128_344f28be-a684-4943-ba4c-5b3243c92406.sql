-- Corregir políticas RLS permisivas

-- Reemplazar política de whatsapp_messages INSERT
DROP POLICY IF EXISTS "Users can create whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users can create whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Reemplazar política de sale_workflow_states INSERT
DROP POLICY IF EXISTS "Users can create sale workflow states" ON public.sale_workflow_states;
CREATE POLICY "Users can create sale workflow states"
  ON public.sale_workflow_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );