import { Database } from '@/integrations/supabase/types';

export type SaleAddendumStatus =
  | 'borrador'
  | 'en_auditoria'
  | 'rechazado'
  | 'aprobado'
  | 'enviado_firma'
  | 'completado'
  | 'cancelado';

export interface SaleAddendum {
  id: string;
  parent_sale_id: string;
  company_id: string;
  type: 'adherent_addition';
  status: SaleAddendumStatus;
  requested_by: string | null;
  audited_by: string | null;
  audit_notes: string | null;
  submitted_at: string | null;
  audited_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  beneficiaries?: AddendumBeneficiary[];
  signature_links?: SignatureLink[];
}

export interface AddendumBeneficiary {
  id: string;
  addendum_id: string;
  beneficiary_id: string | null;
  first_name: string;
  last_name: string;
  dni: string | null;
  document_type: string | null;
  document_number: string | null;
  relationship: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  barrio: string | null;
  city: string | null;
  province: string | null;
  amount: number;
  signature_required: boolean;
  has_preexisting_conditions: boolean;
  preexisting_conditions_detail: string | null;
  status: 'pending' | 'ready_for_signature' | 'signed' | 'active' | 'cancelled';
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignatureLink {
  id: string;
  token: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  status: string;
  expires_at: string;
  completed_at: string | null;
}
