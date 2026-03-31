

# Plan: Remove Hook-Level Cache Overrides

## Problem
The global QueryClient config was updated to `staleTime: 30s` and `refetchOnWindowFocus: true`, but ~18 individual hooks override these with 5-minute staleTime and `refetchOnWindowFocus: false`. The global settings have no effect.

## Fix
Remove `staleTime` and `refetchOnWindowFocus: false` from all individual query hooks so they inherit the global defaults. Keep only cases where a different value is intentionally needed (e.g., `usePermissions` with `staleTime: 0` stays).

### Files to modify (remove staleTime + refetchOnWindowFocus overrides):
1. `src/hooks/useTemplates.ts` — 2 queries
2. `src/hooks/useMenuConfig.ts` — 1 query
3. `src/hooks/useSale.ts` — 1 query
4. `src/hooks/useDocuments.ts` — 3 queries
5. `src/hooks/useDashboard.ts` — 1 query
6. `src/hooks/useUsers.ts` — 1 query (staleTime: 10min)
7. `src/hooks/useBeneficiaries.ts` — 1 query
8. `src/hooks/useSignatureLinks.ts` — 1 query
9. `src/hooks/useSales.ts` — 3 queries (one has 10min staleTime)
10. `src/hooks/useClients.ts` — 2 queries (one has 10min staleTime)
11. `src/hooks/useOptimizedQueries.ts` — 2 queries
12. `src/hooks/useOptimizedProfile.ts` — 1 query
13. `src/components/DocumentsManager.tsx` — 1 query
14. `src/components/sale-form/SaleTemplatesTab.tsx` — 1 query
15. `src/hooks/useSignatureLinkPublic.ts` — 1 query

### What stays unchanged:
- `usePermissions.ts` — `staleTime: 0` (intentional, needs instant freshness)
- `useEffectiveRole.ts` — `staleTime: 30_000` (already matches global)
- Global config in `App.tsx` — already correct

## Result
All queries will inherit the 30-second staleTime and auto-refresh on window focus, ensuring real-time data across the entire application.

