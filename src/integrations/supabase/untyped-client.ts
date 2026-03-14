/**
 * Helper for accessing Supabase tables that exist in the database
 * but are not yet in the auto-generated types.ts.
 *
 * NOTE: As of 2026-03-14, all previously untyped tables have been
 * added to types.ts. This helper currently has zero consumers but
 * is kept available for future tables not yet in the generated types.
 *
 * Usage:
 *   import { fromAnyTable } from '@/integrations/supabase/untyped-client';
 *   const { data } = await fromAnyTable('some_new_table').select('*');
 */
import { supabase } from './client';

export function fromAnyTable(table: string) {
  return (supabase as any).from(table);
}
