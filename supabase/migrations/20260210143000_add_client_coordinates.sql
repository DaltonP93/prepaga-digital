-- Add optional geolocation fields for client home coordinates
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

