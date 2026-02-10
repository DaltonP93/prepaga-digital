import { Database } from '@/integrations/supabase/types';

export type SaleStatus = Database['public']['Enums']['sale_status'];
export type AppRole = 'super_admin' | 'admin' | 'supervisor' | 'auditor' | 'gestor' | 'vendedor';

/** All possible sale states */
export const ALL_SALE_STATUSES: SaleStatus[] = [
  'borrador',
  'enviado',
  'firmado',
  'completado',
  'cancelado',
  'pendiente',
  'en_auditoria',
];

/** Human-readable labels for sale statuses */
export const SALE_STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  firmado: 'Firmado',
  completado: 'Completado',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente',
  en_auditoria: 'En Auditoria',
};

/** All application roles */
export const ALL_ROLES: AppRole[] = [
  'super_admin',
  'admin',
  'supervisor',
  'auditor',
  'gestor',
  'vendedor',
];

/** A condition that must be met for a transition */
export interface TransitionCondition {
  id: string;
  type: 'built_in' | 'custom';
  /** For built_in: key like 'has_client', 'has_plan', etc. */
  built_in_key?: string;
  /** Human-readable label shown in UI */
  label: string;
  /** Optional longer description */
  description?: string;
}

/** A single allowed state transition */
export interface TransitionRule {
  id: string;
  from: SaleStatus;
  to: SaleStatus;
  allowed_roles: AppRole[];
  conditions: TransitionCondition[];
  require_note?: boolean;
}

/** Per-state role visibility/access config */
export interface StateAccessRule {
  state: SaleStatus;
  visible_to: AppRole[];
  editable_by: AppRole[];
}

/** The full workflow configuration (stored as JSONB) */
export interface WorkflowConfig {
  transitions: TransitionRule[];
  state_access: StateAccessRule[];
}

/** Available built-in condition definitions */
export const BUILT_IN_CONDITIONS: { key: string; label: string; description: string }[] = [
  { key: 'has_client', label: 'Cliente asignado', description: 'La venta tiene un cliente asociado' },
  { key: 'has_plan', label: 'Plan seleccionado', description: 'La venta tiene un plan asignado' },
  { key: 'has_beneficiaries', label: 'Adherentes cargados', description: 'La venta tiene al menos un adherente' },
  { key: 'has_documents', label: 'Documentos generados', description: 'La venta tiene PDF de contrato generado' },
  { key: 'has_template', label: 'Template asignado', description: 'La venta tiene template de cuestionario' },
  { key: 'has_ddjj', label: 'DDJJ completada', description: 'El cuestionario de salud fue respondido' },
  { key: 'audit_approved', label: 'Auditoria aprobada', description: 'El proceso de auditoria fue aprobado' },
  { key: 'all_signatures_complete', label: 'Firmas completadas', description: 'Todas las firmas requeridas fueron completadas' },
  { key: 'has_signature_token', label: 'Link de firma generado', description: 'Se genero un token de firma valido' },
];

/** Default workflow config that matches the current implicit flow */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  transitions: [
    {
      id: 'default-1',
      from: 'borrador',
      to: 'enviado',
      allowed_roles: ['vendedor', 'gestor', 'admin', 'super_admin'],
      conditions: [
        { id: 'dc-1', type: 'built_in', built_in_key: 'has_client', label: 'Cliente asignado' },
        { id: 'dc-2', type: 'built_in', built_in_key: 'has_plan', label: 'Plan seleccionado' },
      ],
      require_note: false,
    },
    {
      id: 'default-2',
      from: 'borrador',
      to: 'en_auditoria',
      allowed_roles: ['auditor', 'admin', 'super_admin'],
      conditions: [],
      require_note: false,
    },
    {
      id: 'default-3',
      from: 'en_auditoria',
      to: 'completado',
      allowed_roles: ['auditor', 'admin', 'super_admin'],
      conditions: [
        { id: 'dc-3', type: 'built_in', built_in_key: 'audit_approved', label: 'Auditoria aprobada' },
      ],
      require_note: false,
    },
    {
      id: 'default-4',
      from: 'en_auditoria',
      to: 'cancelado',
      allowed_roles: ['auditor', 'admin', 'super_admin'],
      conditions: [],
      require_note: true,
    },
    {
      id: 'default-5',
      from: 'borrador',
      to: 'cancelado',
      allowed_roles: ['vendedor', 'gestor', 'admin', 'super_admin'],
      conditions: [],
      require_note: true,
    },
    {
      id: 'default-6',
      from: 'enviado',
      to: 'cancelado',
      allowed_roles: ['vendedor', 'gestor', 'admin', 'super_admin'],
      conditions: [],
      require_note: true,
    },
    {
      id: 'default-7',
      from: 'enviado',
      to: 'firmado',
      allowed_roles: ['vendedor', 'gestor', 'admin', 'super_admin'],
      conditions: [
        { id: 'dc-4', type: 'built_in', built_in_key: 'all_signatures_complete', label: 'Firmas completadas' },
      ],
      require_note: false,
    },
    {
      id: 'default-8',
      from: 'firmado',
      to: 'completado',
      allowed_roles: ['admin', 'super_admin'],
      conditions: [],
      require_note: false,
    },
  ],
  state_access: [
    { state: 'borrador', visible_to: ['vendedor', 'gestor', 'supervisor', 'admin', 'super_admin'], editable_by: ['vendedor', 'gestor', 'admin', 'super_admin'] },
    { state: 'enviado', visible_to: ['vendedor', 'gestor', 'supervisor', 'auditor', 'admin', 'super_admin'], editable_by: ['vendedor', 'gestor', 'admin', 'super_admin'] },
    { state: 'en_auditoria', visible_to: ['auditor', 'supervisor', 'admin', 'super_admin'], editable_by: ['auditor', 'admin', 'super_admin'] },
    { state: 'firmado', visible_to: ['vendedor', 'gestor', 'supervisor', 'auditor', 'admin', 'super_admin'], editable_by: ['admin', 'super_admin'] },
    { state: 'completado', visible_to: ['vendedor', 'gestor', 'supervisor', 'auditor', 'admin', 'super_admin'], editable_by: [] },
    { state: 'cancelado', visible_to: ['vendedor', 'gestor', 'supervisor', 'auditor', 'admin', 'super_admin'], editable_by: ['admin', 'super_admin'] },
  ],
};
