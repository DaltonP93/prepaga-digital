

## Fix: Remove `role` from profiles update

### Problem
In `src/hooks/useUsers.ts`, the `useUpdateUser` mutation includes `role` in the `profilePayload` sent to the `profiles` table (lines 173-176). The `profiles` table has no `role` column — roles live in `user_roles`. This causes the error: *"Could not find the 'role' column of 'profiles'"*.

### Fix (single file: `src/hooks/useUsers.ts`)

**Lines 173-176** — Remove the block that adds `role` to `profilePayload`:

```typescript
// BEFORE
const profilePayload: Record<string, any> = { ...profileUpdates };
if (role) {
  profilePayload.role = role;
}

// AFTER
const profilePayload: Record<string, any> = { ...profileUpdates };
// role is handled separately via user_roles table below
```

The role update logic on lines 187-216 (delete old roles + insert new) is already correct and will continue handling role changes via `user_roles`.

