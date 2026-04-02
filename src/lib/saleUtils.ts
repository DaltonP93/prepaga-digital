
import type { AppRole } from '@/types/roles';

const PRIVILEGED_ROLES: AppRole[] = ['super_admin', 'admin', 'auditor', 'supervisor', 'gestor'];

const LOCKED_STATUSES = ['completado', 'aprobado_para_templates', 'listo_para_enviar', 'enviado', 'firmado_parcial', 'firmado', 'expirado'];

/**
 * Returns true when the sale's core data should be read-only for the given role.
 * Privileged roles can always edit; everyone else is locked when audit_status
 * is 'aprobado' or the sale has progressed past audit.
 */
export const isSaleLocked = (
  sale: { audit_status?: string | null; status?: string | null } | null | undefined,
  userRole: AppRole,
): boolean => {
  if (!sale) return false;
  if (PRIVILEGED_ROLES.includes(userRole)) return false;
  if (sale.audit_status === 'aprobado') return true;
  if (LOCKED_STATUSES.includes(sale.status || '')) return true;
  return false;
};

export const isPrivilegedRole = (role: AppRole): boolean =>
  PRIVILEGED_ROLES.includes(role);
