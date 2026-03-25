
-- 1. Crear índices faltantes para foreign keys (mejora crítica de rendimiento)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_sale_id ON documents(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_plan_id ON documents(plan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_template_id ON documents(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signatures_sale_id ON signatures(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signatures_document_id ON signatures(document_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beneficiaries_sale_id ON beneficiaries(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_notes_sale_id ON sale_notes(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_notes_user_id ON sale_notes(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_requirements_sale_id ON sale_requirements(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_requirements_completed_by ON sale_requirements(completed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_documents_sale_id ON sale_documents(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_documents_uploaded_by ON sale_documents(uploaded_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_responses_template_id ON template_responses(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_responses_question_id ON template_responses(question_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_responses_client_id ON template_responses(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_responses_sale_id ON template_responses(sale_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_questions_template_id ON template_questions(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_question_options_question_id ON template_question_options(question_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_comments_template_id ON template_comments(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_comments_parent_comment_id ON template_comments(parent_comment_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_workflow_states_template_id ON template_workflow_states(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_analytics_template_id ON template_analytics(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_logs_recipient_id ON communication_logs(recipient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_logs_campaign_id ON communication_logs(campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_logs_company_id ON communication_logs(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_template_id ON email_campaigns(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_company_id ON email_campaigns(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_company_id ON email_templates(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);

-- 2. Mejoras de seguridad para tokens de firma
ALTER TABLE sales ADD COLUMN IF NOT EXISTS token_revoked boolean DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS token_revoked_at timestamp with time zone;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS token_revoked_by uuid REFERENCES profiles(id);

-- 3. Mejorar auditoría para documentos firmados
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS document_hash text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS signature_validation boolean;

-- 4. Índices para queries comunes de autenticación (optimización RLS)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_company_id_role ON profiles(company_id, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_company_id_status ON sales(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_signature_token ON sales(signature_token) WHERE signature_token IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_expires_at ON sales(signature_expires_at) WHERE signature_expires_at IS NOT NULL;

-- 5. Eliminar índices innecesarios identificados
DROP INDEX CONCURRENTLY IF EXISTS idx_template_comments_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_template_analytics_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_template_analytics_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_access_logs_access_time;
DROP INDEX CONCURRENTLY IF EXISTS idx_communication_logs_sent_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_email_campaigns_scheduled_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_email_campaigns_sent_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_file_uploads_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_password_reset_tokens_expires_at;

-- 6. Función para revocar tokens de firma
CREATE OR REPLACE FUNCTION public.revoke_signature_token(
  p_sale_id uuid,
  p_reason text DEFAULT 'Manual revocation'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verificar permisos
  IF NOT (
    (SELECT company_id FROM public.sales WHERE id = p_sale_id) = 
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para revocar este token';
  END IF;

  -- Revocar token
  UPDATE public.sales 
  SET 
    token_revoked = true,
    token_revoked_at = now(),
    token_revoked_by = auth.uid()
  WHERE id = p_sale_id
    AND signature_token IS NOT NULL
    AND token_revoked = false;

  -- Crear log de auditoría
  INSERT INTO public.audit_logs (
    table_name, action, record_id, 
    new_values, user_id, 
    request_method, request_path
  ) VALUES (
    'sales', 'token_revoked', p_sale_id,
    jsonb_build_object('reason', p_reason, 'revoked_at', now()),
    auth.uid(),
    'FUNCTION', 'revoke_signature_token'
  );

  RETURN true;
END;
$$;

-- 7. Trigger para actualizar updated_at en sales cuando se revoca token
CREATE OR REPLACE FUNCTION public.handle_token_revocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.token_revoked = true AND OLD.token_revoked = false THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_token_revocation ON public.sales;
CREATE TRIGGER trigger_token_revocation
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_token_revocation();
