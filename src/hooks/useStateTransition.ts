import { useCallback } from 'react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useWorkflowConfig } from '@/hooks/useWorkflowConfig';
import { toast } from 'sonner';
import type { SaleStatus, TransitionRule, WorkflowConfig, AppRole } from '@/types/workflow';

/** Minimal sale shape needed for condition evaluation */
export interface SaleForTransition {
  status: SaleStatus | null;
  client_id?: string | null;
  plan_id?: string | null;
  template_id?: string | null;
  contract_pdf_url?: string | null;
  signature_token?: string | null;
  all_signatures_completed?: boolean | null;
  audit_status?: string | null;
  adherents_count?: number | null;
  template_responses?: Array<{ id: string }> | null;
  beneficiaries?: any[] | null;
}

/** Evaluate a built-in condition against sale data */
function evaluateBuiltInCondition(key: string, sale: SaleForTransition): boolean {
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

export interface TransitionCheckResult {
  allowed: boolean;
  reasons: string[];
  rule: TransitionRule | null;
}

export const useStateTransition = () => {
  const { profile } = useSimpleAuthContext();
  const role = (profile?.role as AppRole) || 'vendedor';
  const { data: configRow } = useWorkflowConfig(profile?.company_id);

  const isWorkflowActive = configRow?.is_active ?? false;

  /** Check if a transition is allowed (pure validation, no side effects) */
  const canTransition = useCallback(
    (
      sale: SaleForTransition,
      targetStatus: SaleStatus,
      customConditionsMet?: Record<string, boolean>
    ): TransitionCheckResult => {
      if (!isWorkflowActive || !configRow?.workflow_config) {
        return { allowed: true, reasons: [], rule: null };
      }

      const config = configRow.workflow_config as WorkflowConfig;
      const currentStatus = sale.status;
      const reasons: string[] = [];

      const rule = config.transitions.find(
        (t) => t.from === currentStatus && t.to === targetStatus
      );

      if (!rule) {
        return {
          allowed: false,
          reasons: ['Transicion no permitida en la configuracion'],
          rule: null,
        };
      }

      if (rule.allowed_roles.length > 0 && !rule.allowed_roles.includes(role)) {
        reasons.push(`El rol "${role}" no puede realizar esta transicion`);
      }

      for (const cond of rule.conditions) {
        if (cond.type === 'built_in' && cond.built_in_key) {
          if (!evaluateBuiltInCondition(cond.built_in_key, sale)) {
            reasons.push(cond.label);
          }
        } else if (cond.type === 'custom') {
          if (!customConditionsMet?.[cond.id]) {
            reasons.push(cond.label);
          }
        }
      }

      return { allowed: reasons.length === 0, reasons, rule };
    },
    [isWorkflowActive, configRow, role]
  );

  /** Validate a transition and show error toast if not allowed */
  const validateTransition = useCallback(
    (
      sale: SaleForTransition,
      targetStatus: SaleStatus,
      customConditionsMet?: Record<string, boolean>
    ): boolean => {
      const check = canTransition(sale, targetStatus, customConditionsMet);
      if (!check.allowed) {
        toast.error('No se puede cambiar el estado: ' + check.reasons.join(', '));
      }
      return check.allowed;
    },
    [canTransition]
  );

  /** Get available next states for a sale based on the current role */
  const getAvailableTransitions = useCallback(
    (sale: SaleForTransition): TransitionRule[] => {
      if (!isWorkflowActive || !configRow?.workflow_config) {
        return [];
      }

      const config = configRow.workflow_config as WorkflowConfig;
      return config.transitions.filter(
        (t) => t.from === sale.status && t.allowed_roles.includes(role)
      );
    },
    [isWorkflowActive, configRow, role]
  );

  /** Check if the current role can see sales in a given state */
  const canViewState = useCallback(
    (state: SaleStatus): boolean => {
      if (!isWorkflowActive || !configRow?.workflow_config) {
        return true;
      }

      const config = configRow.workflow_config as WorkflowConfig;
      const accessRule = config.state_access.find((a) => a.state === state);
      if (!accessRule) return true;
      return accessRule.visible_to.includes(role);
    },
    [isWorkflowActive, configRow, role]
  );

  /** Check if the current role can edit sales in a given state */
  const canEditState = useCallback(
    (state: SaleStatus): boolean => {
      if (!isWorkflowActive || !configRow?.workflow_config) {
        return true;
      }

      const config = configRow.workflow_config as WorkflowConfig;
      const accessRule = config.state_access.find((a) => a.state === state);
      if (!accessRule) return true;
      return accessRule.editable_by.includes(role);
    },
    [isWorkflowActive, configRow, role]
  );

  return {
    canTransition,
    validateTransition,
    getAvailableTransitions,
    canViewState,
    canEditState,
    isWorkflowActive,
  };
};
