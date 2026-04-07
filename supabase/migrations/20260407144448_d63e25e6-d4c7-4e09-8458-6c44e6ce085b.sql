
CREATE OR REPLACE FUNCTION public.get_pdf_branding_by_token(p_token text)
RETURNS TABLE(pdf_header_image_url text, pdf_footer_image_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cs.pdf_header_image_url::text,
    cs.pdf_footer_image_url::text
  FROM signature_links sl
  JOIN sales s ON s.id = sl.sale_id
  JOIN company_settings cs ON cs.company_id = s.company_id
  WHERE sl.token = p_token
    AND sl.expires_at > now()
    AND sl.status != 'revocado'
  LIMIT 1;
$$;
