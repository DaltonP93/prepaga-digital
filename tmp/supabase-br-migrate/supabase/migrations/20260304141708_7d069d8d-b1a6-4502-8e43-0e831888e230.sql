ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS favicon text;
NOTIFY pgrst, 'reload schema';