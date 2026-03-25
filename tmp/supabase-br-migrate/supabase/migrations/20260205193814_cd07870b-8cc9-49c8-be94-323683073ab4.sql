-- ================================================
-- PARTE 1: Agregar valores al enum app_role
-- ================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';