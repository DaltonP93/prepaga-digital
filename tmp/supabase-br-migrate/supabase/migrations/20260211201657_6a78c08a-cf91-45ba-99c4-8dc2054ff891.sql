-- Make recipient_email nullable (not all recipients have email)
ALTER TABLE public.signature_links ALTER COLUMN recipient_email DROP NOT NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';