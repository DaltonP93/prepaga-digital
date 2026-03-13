ALTER TABLE public.template_assets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS converted_asset_id uuid REFERENCES public.template_assets(id),
  ADD COLUMN IF NOT EXISTS processing_error text;