

# Plan: Fix Sale Progress, Caching, Real-Time Updates & Dynamic Notifications

## Issue 1: Sale progress stuck at 80% when flow is complete

**Root cause**: The progress bar uses `getProgress(sale.status)` which maps to `DEFAULT_PROGRESS_CONFIG` where `enviado = 80`. The DB trigger `auto_advance_sale_status` should update the status to `completado` (100%) when all signature links are completed, but it appears the trigger didn't fire or the sale status wasn't updated for this specific sale (2026-000044).

**Fix**:
1. Make progress bar **hybrid**: check `sale.status` AND `sale.all_signatures_completed`. If `all_signatures_completed === true` but status isn't `completado`, show 100% and trigger a status correction
2. Add a one-time data fix query to update any sales stuck with `all_signatures_completed = true` but status != `completado`
3. Ensure the `auto_advance_sale_status` trigger is correctly attached to `signature_links` table (verify via migration)

**Files**: `src/pages/Sales.tsx`, new migration SQL

---

## Issue 2: Browser caching prevents fresh data

**Root cause**: `staleTime: 5 * 60 * 1000` (5 minutes) in QueryClient defaults + `refetchOnWindowFocus: false` means data can be stale for 5 minutes and won't refresh when user returns to tab.

**Fix**:
1. Reduce `staleTime` to `30 * 1000` (30 seconds) globally in `App.tsx`
2. Enable `refetchOnWindowFocus: true` so data refreshes when user switches tabs
3. Remove the aggressive `CacheManager` that clears localStorage (it can interfere with auth sessions)
4. Add `Cache-Control: no-cache` meta tag to `index.html` to prevent browser caching of the SPA shell

**Files**: `src/App.tsx`, `index.html`

---

## Issue 3: Real-time updates without page refresh

**Root cause**: The real-time system is already well-implemented in `useRealTimeNotifications.ts` with Supabase Realtime channels. The main issue is the 5-minute staleTime preventing invalidated queries from actually refetching.

**Fix**:
1. With the reduced `staleTime` from Issue 2, invalidations from Realtime will trigger immediate refetches
2. Add `company_settings` and `company_ui_settings` tables to the Realtime listener so config changes propagate instantly
3. Ensure `useSalesList` query doesn't override global staleTime with its own longer value

**Files**: `src/hooks/useRealTimeNotifications.ts`

---

## Issue 4: Social-media-style dynamic notifications

**Current state**: `NotificationCenter.tsx` is a basic popover with a flat list. No grouping, no animations, no sound, no auto-dismiss toasts.

**Enhancements**:
1. **Toast notifications with slide-in animation**: When a new notification arrives via Realtime, show a floating toast that auto-dismisses (like Facebook's top-right notifications)
2. **Group notifications by type/time**: Group notifications from the same hour or same type (e.g., "3 firmas completadas")
3. **Unread indicator pulse animation**: Add a pulsing animation to the bell icon badge when new notifications arrive
4. **Sound notification**: Play a subtle notification sound on new notifications (optional, respecting user preference)
5. **"Just now" live timestamps**: Show relative times that update every minute
6. **Click-to-navigate**: Clicking a notification navigates to the relevant sale/document (already partially implemented with `notification.link`)
7. **Swipe to dismiss** on mobile (stretch goal)

**Files**: `src/components/NotificationCenter.tsx`, `src/hooks/useRealTimeNotifications.ts`, `src/hooks/useNotifications.ts`

---

## Implementation Order
1. Migration: fix stuck sales + verify trigger attachment
2. Reduce staleTime + enable refetchOnWindowFocus in `App.tsx`
3. Add cache-control headers to `index.html`
4. Enhance Realtime listener with additional tables
5. Upgrade NotificationCenter with animations, grouping, pulse badge, and sound

