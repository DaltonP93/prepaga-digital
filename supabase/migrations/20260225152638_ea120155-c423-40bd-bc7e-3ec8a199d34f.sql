
-- Add RLS policies for public signature token users to UPDATE and DELETE documents
CREATE POLICY "Public can update documents by signature token"
  ON public.documents
  FOR UPDATE
  USING (sale_id = get_sale_id_from_signature_token())
  WITH CHECK (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can delete documents by signature token"
  ON public.documents
  FOR DELETE
  USING (sale_id = get_sale_id_from_signature_token());
