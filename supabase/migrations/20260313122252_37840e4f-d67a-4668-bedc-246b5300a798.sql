
-- ============================================================
-- Phase 1: Template Designer 2.0 Premium — Schema Foundation
-- ============================================================

-- 1) Extend existing tables
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS designer_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS render_engine text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS published_version_id uuid;

ALTER TABLE public.template_versions
  ADD COLUMN IF NOT EXISTS designer_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS layout_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version_label text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS template_version_id uuid,
  ADD COLUMN IF NOT EXISTS template_designer_version text;

-- 2) template_assets — source files for templates
CREATE TABLE IF NOT EXISTS public.template_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  file_size bigint,
  page_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template assets via template company"
  ON public.template_assets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = template_assets.template_id AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.templates t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = template_assets.template_id AND p.id = auth.uid()
    )
  );

-- 3) template_asset_pages — per-page previews
CREATE TABLE IF NOT EXISTS public.template_asset_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.template_assets(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  preview_image_url text,
  width numeric,
  height numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_asset_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage asset pages via template company"
  ON public.template_asset_pages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_assets ta
      JOIN public.templates t ON t.id = ta.template_id
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE ta.id = template_asset_pages.asset_id AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.template_assets ta
      JOIN public.templates t ON t.id = ta.template_id
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE ta.id = template_asset_pages.asset_id AND p.id = auth.uid()
    )
  );

-- 4) template_blocks — canvas blocks
CREATE TABLE IF NOT EXISTS public.template_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  page integer NOT NULL DEFAULT 1,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  w numeric NOT NULL DEFAULT 100,
  h numeric NOT NULL DEFAULT 50,
  z_index integer NOT NULL DEFAULT 0,
  rotation numeric NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template blocks via template company"
  ON public.template_blocks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = template_blocks.template_id AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.templates t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = template_blocks.template_id AND p.id = auth.uid()
    )
  );

-- updated_at trigger for template_blocks
CREATE TRIGGER update_template_blocks_updated_at
  BEFORE UPDATE ON public.template_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5) template_fields — interactive fields per signer
CREATE TABLE IF NOT EXISTS public.template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.template_blocks(id) ON DELETE CASCADE,
  signer_role text NOT NULL,
  field_type text NOT NULL,
  page integer NOT NULL DEFAULT 1,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  w numeric NOT NULL DEFAULT 100,
  h numeric NOT NULL DEFAULT 30,
  required boolean NOT NULL DEFAULT true,
  label text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template fields via template company"
  ON public.template_fields FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = template_fields.template_id AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.templates t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = template_fields.template_id AND p.id = auth.uid()
    )
  );
