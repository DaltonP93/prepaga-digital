ALTER TABLE public.template_assets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded';
ALTER TABLE public.template_assets ADD COLUMN IF NOT EXISTS converted_asset_id uuid REFERENCES public.template_assets(id);
ALTER TABLE public.template_assets ADD COLUMN IF NOT EXISTS processing_error text;