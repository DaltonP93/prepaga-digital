ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS _regen_trigger boolean DEFAULT false;
ALTER TABLE public.templates DROP COLUMN IF EXISTS _regen_trigger;