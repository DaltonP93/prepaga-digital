import { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AppRole = Database['public']['Enums']['app_role'];

// Extended profile that includes the role from user_roles table
export interface ProfileWithRole extends Profile {
  role: AppRole | null;
}
