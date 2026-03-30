-- Agregar columnas de branding a la tabla companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#667eea';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#764ba2';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#4ade80';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS favicon TEXT DEFAULT '/favicon.ico';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS font_family VARCHAR(50) DEFAULT 'Inter';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS border_radius VARCHAR(10) DEFAULT '0.5rem';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS shadows BOOLEAN DEFAULT true;