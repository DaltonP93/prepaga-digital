/**
 * Type augmentation for Supabase tables that exist in the database
 * but are not yet in the auto-generated types.ts file.
 *
 * This file extends the Database interface so that
 * `supabase.from('template_blocks')` etc. compile without errors.
 */
import type { Json } from './types';

// Minimal row shapes – only the columns we actually reference in hooks.
// The hooks already cast results with `as unknown as …`, so we only need
// enough structure here for the Supabase client to accept the table name.

interface MinimalRow { id: string; [key: string]: unknown }

type MinimalTable = {
  Row: MinimalRow;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: never[];
};

declare module './types' {
  interface PublicTables {
    template_blocks: MinimalTable;
    template_assets: MinimalTable;
    template_asset_pages: MinimalTable;
    template_fields: MinimalTable;
    incidents: MinimalTable;
    incident_comments: MinimalTable;
    incident_attachments: MinimalTable;
  }

  // Augment the Database type so `.from(tableName)` accepts these strings.
  export interface Database {
    public: {
      Tables: Database['public']['Tables'] & PublicTables;
      Views: Database['public']['Views'];
      Functions: Database['public']['Functions'];
      Enums: Database['public']['Enums'];
      CompositeTypes: Database['public']['CompositeTypes'];
    };
  }
}
