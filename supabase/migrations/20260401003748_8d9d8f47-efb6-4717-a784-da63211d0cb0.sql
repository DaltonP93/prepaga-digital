ALTER TABLE public.company_settings 
  ADD COLUMN IF NOT EXISTS pdf_header_image_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_footer_image_url TEXT;