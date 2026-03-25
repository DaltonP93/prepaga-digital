
-- Crear tabla para procesos de auditoría
CREATE TABLE IF NOT EXISTS public.audit_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) NOT NULL,
  auditor_id UUID REFERENCES public.profiles(id) NOT NULL,
  status VARCHAR DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para trazas de procesos
CREATE TABLE IF NOT EXISTS public.process_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) NOT NULL,
  action VARCHAR NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  client_action BOOLEAN DEFAULT false,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para solicitudes de información
CREATE TABLE IF NOT EXISTS public.information_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_process_id UUID REFERENCES public.audit_processes(id) NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Crear tabla para notificaciones de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) NOT NULL,
  recipient_phone VARCHAR NOT NULL,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR DEFAULT 'pending',
  notification_url VARCHAR NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  api_response JSONB,
  created_by UUID REFERENCES public.profiles(id)
);

-- Crear tabla para configuraciones de UI de empresa
CREATE TABLE IF NOT EXISTS public.company_ui_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  dark_mode BOOLEAN DEFAULT false,
  shadows BOOLEAN DEFAULT true,
  font_family VARCHAR DEFAULT 'Inter',
  border_radius VARCHAR DEFAULT '0.5rem',
  primary_color VARCHAR DEFAULT '#667eea',
  secondary_color VARCHAR DEFAULT '#764ba2',
  accent_color VARCHAR DEFAULT '#4ade80',
  favicon TEXT DEFAULT '/favicon.ico',
  custom_css TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.audit_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.information_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_ui_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_processes
CREATE POLICY "Company users can manage audit processes" ON public.audit_processes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = audit_processes.sale_id 
    AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  )
);

-- Políticas RLS para process_traces
CREATE POLICY "Company users can manage process traces" ON public.process_traces
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = process_traces.sale_id 
    AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  )
);

-- Políticas RLS para information_requests
CREATE POLICY "Company users can manage information requests" ON public.information_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.audit_processes ap
    JOIN public.sales s ON s.id = ap.sale_id
    WHERE ap.id = information_requests.audit_process_id 
    AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  )
);

-- Políticas RLS para whatsapp_notifications
CREATE POLICY "Company users can manage whatsapp notifications" ON public.whatsapp_notifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = whatsapp_notifications.sale_id 
    AND (s.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  )
);

-- Políticas RLS para company_ui_settings
CREATE POLICY "Company users can manage their UI settings" ON public.company_ui_settings
FOR ALL USING (
  company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_processes_sale_id ON public.audit_processes(sale_id);
CREATE INDEX IF NOT EXISTS idx_audit_processes_status ON public.audit_processes(status);
CREATE INDEX IF NOT EXISTS idx_process_traces_sale_id ON public.process_traces(sale_id);
CREATE INDEX IF NOT EXISTS idx_information_requests_audit_process_id ON public.information_requests(audit_process_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_sale_id ON public.whatsapp_notifications(sale_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON public.whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS idx_company_ui_settings_company_id ON public.company_ui_settings(company_id);
