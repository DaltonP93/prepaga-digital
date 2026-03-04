ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS custom_css text;
NOTIFY pgrst, 'reload schema';