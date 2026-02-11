-- ============================================================================
-- Migration 1/2: Add enum values (must be committed before use)
-- Description:
--   1. Adds 'financiero' to app_role enum
--   2. Adds extended sale_status values if not present
-- ============================================================================

-- 1. Add 'financiero' to app_role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'financiero'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financiero';
  END IF;
END $$;

-- 2. Ensure extended sale_status values exist
DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'rechazado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'aprobado_para_templates';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'preparando_documentos';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'esperando_ddjj';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'en_revision';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'listo_para_enviar';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'firmado_parcial';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'expirado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
