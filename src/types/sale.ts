import { Database } from '@/integrations/supabase/types';

export type SaleRow = Database['public']['Tables']['sales']['Row'];
export type ClientRow = Database['public']['Tables']['clients']['Row'] | null;
export type PlanRow = Database['public']['Tables']['plans']['Row'] | null;
export type CompanyRow = Database['public']['Tables']['companies']['Row'] | null;
export type BeneficiaryRow = Database['public']['Tables']['beneficiaries']['Row'];

export interface SaleWithRelations extends SaleRow {
  clients: ClientRow;
  plans: PlanRow;
  companies: CompanyRow;
  beneficiaries: BeneficiaryRow[];
}
