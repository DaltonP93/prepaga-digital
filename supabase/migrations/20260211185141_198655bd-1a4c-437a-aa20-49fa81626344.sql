
-- Allow vendedores to delete their own sales (only borrador/rechazado status)
CREATE POLICY "Vendedor can delete own draft sales"
ON public.sales
FOR DELETE
USING (
  salesperson_id = auth.uid()
  AND status IN ('borrador', 'rechazado')
);
