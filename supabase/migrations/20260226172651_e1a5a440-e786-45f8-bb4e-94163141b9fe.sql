
-- Company OTP Policy configuration table
CREATE TABLE public.company_otp_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  require_otp_for_signature boolean NOT NULL DEFAULT true,
  otp_length integer NOT NULL DEFAULT 6,
  otp_expiration_seconds integer NOT NULL DEFAULT 300,
  max_attempts integer NOT NULL DEFAULT 3,
  default_channel text NOT NULL DEFAULT 'email',
  allowed_channels jsonb NOT NULL DEFAULT '["email"]'::jsonb,
  whatsapp_otp_enabled boolean NOT NULL DEFAULT false,
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password_encrypted text,
  smtp_from_address text,
  smtp_from_name text,
  smtp_tls boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_otp_policy ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage OTP policy"
  ON public.company_otp_policy FOR ALL
  USING (
    company_id IN (
      SELECT profiles.company_id FROM profiles
      WHERE profiles.id = auth.uid()
        AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- All authenticated users can read own company policy
CREATE POLICY "Users can read own company OTP policy"
  ON public.company_otp_policy FOR SELECT
  USING (
    company_id IN (
      SELECT profiles.company_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Public read for signature token (edge function needs this)
CREATE POLICY "Public can read OTP policy by signature token"
  ON public.company_otp_policy FOR SELECT
  USING (
    company_id IN (
      SELECT s.company_id FROM sales s
      WHERE s.id = get_sale_id_from_signature_token()
    )
  );

-- Add channel column to signature_identity_verification if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signature_identity_verification' AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.signature_identity_verification ADD COLUMN channel text DEFAULT 'email';
  END IF;
END $$;
