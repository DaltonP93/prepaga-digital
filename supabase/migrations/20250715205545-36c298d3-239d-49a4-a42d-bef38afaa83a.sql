-- Agregar campos Barrio y Estado Civil a la tabla clients
ALTER TABLE public.clients 
ADD COLUMN neighborhood TEXT,
ADD COLUMN marital_status TEXT;