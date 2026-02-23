-- Add 'barrio' (neighborhood) field to clients table
-- Paraguay uses 'departamento' instead of 'provincia' but we keep the DB column name
-- as 'province' for backward compatibility. The UI label changes to 'Departamento'.

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS barrio VARCHAR(100);

-- Also add barrio to beneficiaries for consistency
ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS barrio VARCHAR(100);
