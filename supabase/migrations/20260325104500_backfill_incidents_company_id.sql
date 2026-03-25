UPDATE public.incidents
SET company_id = '0a1dc0e5-7378-4d14-b7bc-646b3e652bc6'::uuid
WHERE company_id IS NULL;
