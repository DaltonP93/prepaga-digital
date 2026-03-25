-- Add SignWell integration columns to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS signwell_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signwell_api_key TEXT;

-- Add SignWell columns to signature_links for tracking
ALTER TABLE public.signature_links
ADD COLUMN IF NOT EXISTS signwell_document_id TEXT,
ADD COLUMN IF NOT EXISTS signwell_signing_url TEXT;
