/**
 * Helper for accessing Supabase tables that exist in the database
 * but are not yet in the auto-generated types.ts.
 *
 * Usage:
 *   import { fromAnyTable } from '@/integrations/supabase/untyped-client';
 *   const { data } = await fromAnyTable('template_blocks').select('*');
 */
import { supabase } from './client';

export function fromAnyTable(table: string) {
  return (supabase as any).from(table);
}
