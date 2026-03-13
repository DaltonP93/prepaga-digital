// Re-export all types from the auto-generated file
// This wrapper exists to work around a stale build cache issue
// @ts-nocheck is applied to the source via tsconfig exclude/include

export type { 
  Json, 
  Database, 
  Tables, 
  TablesInsert, 
  TablesUpdate, 
  Enums, 
  CompositeTypes 
} from './types';
export { Constants } from './types';