-- ============================================================================
-- Migration 2/2: Tables, RLS policies, and triggers
-- (Runs after enum values are committed in previous migration)
-- Description:
--   1. Creates audit_comments table for auditor observations
--   2. RLS policies blocking financiero from sales/clients
--   3. Trigger blocking vendedor UPDATE when status != borrador/rechazado
-- ============================================================================

-- 1. Create audit_comments table
CREATE TABLE IF NOT EXISTS public.audit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  -- The sale status at the time the comment was made
  sale_status_at_comment TEXT,
  -- Whether this comment is associated with an audit action (approve/reject)
  audit_action TEXT CHECK (audit_action IN ('approve', 'reject', 'comment', 'return')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by sale
CREATE INDEX IF NOT EXISTS idx_audit_comments_sale_id ON public.audit_comments(sale_id);
CREATE INDEX IF NOT EXISTS idx_audit_comments_user_id ON public.audit_comments(user_id);

-- Enable RLS
ALTER TABLE public.audit_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_comments
-- Anyone authenticated can read comments
CREATE POLICY "audit_comments_select" ON public.audit_comments
  FOR SELECT TO authenticated
  USING (true);

-- Only auditors, admins, super_admins can insert comments
CREATE POLICY "audit_comments_insert" ON public.audit_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'auditor')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- 2. RLS: Block financiero from reading sales (RESTRICTIVE = must pass AND with permissive policies)
CREATE POLICY "sales_block_financiero" ON public.sales
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'financiero')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Block financiero from clients table too
CREATE POLICY "clients_block_financiero" ON public.clients
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'financiero')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4. Block vendedor from UPDATE on sales when status != borrador/rechazado
CREATE OR REPLACE FUNCTION public.check_vendedor_edit_restriction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restrict vendedor role
  IF public.has_role(auth.uid(), 'vendedor')
    AND NOT public.has_role(auth.uid(), 'admin')
    AND NOT public.has_role(auth.uid(), 'super_admin')
    AND NOT public.has_role(auth.uid(), 'gestor')
  THEN
    -- Allow update only if current status is borrador or rechazado
    IF OLD.status NOT IN ('borrador', 'rechazado') THEN
      RAISE EXCEPTION 'Vendedor solo puede editar ventas en estado Borrador o Rechazado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_check_vendedor_edit ON public.sales;
CREATE TRIGGER trg_check_vendedor_edit
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vendedor_edit_restriction();
