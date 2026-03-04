ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS border_radius text,
  ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS font_family text,
  ADD COLUMN IF NOT EXISTS shadows boolean DEFAULT true;

NOTIFY pgrst, 'reload schema';