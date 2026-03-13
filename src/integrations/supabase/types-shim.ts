export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Temporary shim to avoid build break caused by duplicated cached declaration in auto-generated types.ts
export type Database = any;

export type Tables<_T extends string | { schema: string }, _Name extends string = never> = any;
export type TablesInsert<_T extends string | { schema: string }, _Name extends string = never> = any;
export type TablesUpdate<_T extends string | { schema: string }, _Name extends string = never> = any;
export type Enums<_T extends string | { schema: string }, _Name extends string = never> = any;
export type CompositeTypes<_T extends string | { schema: string }, _Name extends string = never> = any;

export const Constants = { public: { Enums: {} } } as const;
