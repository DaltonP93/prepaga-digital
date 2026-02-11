import { supabase } from '@/integrations/supabase/client';
import type { SaleStatus, WorkflowConfig, TransitionRule, AppRole } from '@/types/workflow';

/** Minimal sale shape needed for condition evaluation */
interface SaleData {
  status: string | null;
  client_id?: string | null;
  plan_id?: string | null;
  template_id?: string | null;
  contract_pdf_url?: string | null;
  signature_token?: string | null;
  all_signatures_completed?: boolean | null;
  audit_status?: string | null;
  adherents_count?: number | null;
  template_responses?: any[] | null;
  beneficiaries?: any[] | null;
}

function evaluateBuiltInCondition(key: string, sale: SaleData): boolean {
  switch (key) {
    case 'has_client':
      return !!sale.client_id;
    case 'has_plan':
      return !!sale.plan_id;
    case 'has_beneficiaries':
      return (sale.adherents_count ?? sale.beneficiaries?.length ?? 0) > 0;
    case 'has_documents':
      return !!sale.contract_pdf_url;
    case 'has_template':
      return !!sale.template_id;
    case 'has_ddjj':
      return !!sale.template_responses && sale.template_responses.length > 0;
    case 'audit_approved':
      return sale.audit_status === 'aprobado';
    case 'all_signatures_complete':
      return sale.all_signatures_completed === true;
    case 'has_signature_token':
      return !!sale.signature_token;
    default:
      return true;
  }
}

/**
 * Validate a sale status transition against the company workflow config.
 * Returns { allowed: true } if workflow is inactive or transition is valid.
 * Returns { allowed: false, reasons: [...] } if transition is blocked.
 *
 * This is a plain function (not a hook) so it can be called from within mutations.
 */
export async function validateSaleTransition(
  companyId: string,
  sale: SaleData,
  targetStatus: SaleStatus,
  userRole: AppRole
): Promise<{ allowed: boolean; reasons: string[]; rule: TransitionRule | null }> {
  // Fetch workflow config for this company
  const { data: configRow, error } = await supabase
    .from('company_workflow_config' as any)
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  // If no config or error, allow (backward compatible)
  if (error || !configRow || !(configRow as any).is_active) {
    return { allowed: true, reasons: [], rule: null };
  }

  const config = (configRow as any).workflow_config as WorkflowConfig;
  if (!config?.transitions) {
    return { allowed: true, reasons: [], rule: null };
  }

  const currentStatus = sale.status;
  const reasons: string[] = [];

  const rule = config.transitions.find(
    (t: TransitionRule) => t.from === currentStatus && t.to === targetStatus
  );

  if (!rule) {
    return {
      allowed: false,
      reasons: ['Transicion no permitida en la configuracion'],
      rule: null,
    };
  }

  if (rule.allowed_roles.length > 0 && !rule.allowed_roles.includes(userRole)) {
    reasons.push(`El rol "${userRole}" no puede realizar esta transicion`);
  }

  for (const cond of rule.conditions) {
    if (cond.type === 'built_in' && cond.built_in_key) {
      if (!evaluateBuiltInCondition(cond.built_in_key, sale)) {
        reasons.push(cond.label);
      }
    }
    // Custom conditions are only validated in UI (checkbox-based), not in mutation-level validation
  }

  return { allowed: reasons.length === 0, reasons, rule };
}
