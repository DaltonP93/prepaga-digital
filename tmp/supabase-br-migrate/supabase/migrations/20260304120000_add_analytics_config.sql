-- Add analytics_config JSONB column to company_ui_settings
-- Stores per-company analytics panel visibility settings (KPIs + tabs)

ALTER TABLE public.company_ui_settings
ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.company_ui_settings.analytics_config IS 'JSON object with kpis and tabs visibility toggles for analytics dashboard';
