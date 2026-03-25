-- Add sale_progress_config JSONB column to company_ui_settings
-- Stores per-status progress percentages for the sales list view

ALTER TABLE public.company_ui_settings
ADD COLUMN IF NOT EXISTS sale_progress_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.company_ui_settings.sale_progress_config IS 'JSON object mapping sale statuses to progress percentages (0-100)';
