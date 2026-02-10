-- Migration: Add company_workflow_config table for configurable sale state machine
-- Each company can define: allowed transitions, conditions, role permissions per state

-- Step 1: Expand sale_status enum with missing states
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'preparando_documentos';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'esperando_ddjj';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'en_revision';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'rechazado';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'aprobado_para_templates';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'listo_para_enviar';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'firmado_parcial';
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'expirado';

-- Step 2: Create workflow config table (1 row per company)
CREATE TABLE IF NOT EXISTS company_workflow_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_company_workflow UNIQUE (company_id)
);

-- Step 3: RLS policies
ALTER TABLE company_workflow_config ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user in the same company, or super_admin
CREATE POLICY "company_workflow_config_select" ON company_workflow_config
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Insert: admin or super_admin only
CREATE POLICY "company_workflow_config_insert" ON company_workflow_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Update: admin or super_admin only
CREATE POLICY "company_workflow_config_update" ON company_workflow_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Delete: super_admin only
CREATE POLICY "company_workflow_config_delete" ON company_workflow_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Step 4: Index
CREATE INDEX idx_company_workflow_config_company ON company_workflow_config(company_id);

-- Step 5: Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_workflow_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_workflow_config_updated_at
  BEFORE UPDATE ON company_workflow_config
  FOR EACH ROW EXECUTE FUNCTION update_workflow_config_updated_at();
