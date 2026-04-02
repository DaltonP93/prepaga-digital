
CREATE TABLE public.waha_health_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_status text NOT NULL DEFAULT 'UNKNOWN',
  response_time_ms integer,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waha_health_logs_company_checked ON public.waha_health_logs (company_id, checked_at DESC);

ALTER TABLE public.waha_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their company health logs"
ON public.waha_health_logs
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'supervisor', 'gestor')
);
