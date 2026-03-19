

# Plan: Add is_active toggle to UserForm + Fix session error on update

## Problems identified

1. **No is_active field in edit form**: The UserForm dialog has no toggle to activate/deactivate a user.
2. **All updates fail with "Sesión inválida"**: The `useUpdateUser` mutation calls `supabase.auth.getUser()` and throws if no user is found. In the preview environment (and potentially on session expiry), this fails — so both the toggle button in the table AND the save button in the form silently fail.

## Changes

### 1. `src/components/UserForm.tsx` — Add is_active Switch

In the edit form (after the company selector, before the password section), add:

```tsx
{isEditing && (
  <div className="flex items-center justify-between border-t pt-4">
    <Label>Estado del usuario</Label>
    <Switch
      checked={watch("is_active")}
      onCheckedChange={(val) => setValue("is_active", val)}
    />
    <Badge variant={watch("is_active") ? "default" : "secondary"}>
      {watch("is_active") ? "Activo" : "Inactivo"}
    </Badge>
  </div>
)}
```

Add `is_active` to the form data interface and default values.

### 2. `src/hooks/useUsers.ts` — Fix session validation

The `useUpdateUser` mutation gets the actor via `supabase.auth.getUser()`. If this returns null (preview, expired session), it throws immediately.

**Fix**: Use `supabase.auth.getSession()` as a fallback, and surface a clearer error prompting re-login. Also ensure `is_active` is included in the profile update fields so the toggle actually persists.

### 3. `src/pages/Users.tsx` — Add confirmation dialog for status toggle

Wrap the existing `handleToggleUserStatus` with a confirmation prompt to prevent accidental deactivation. The button already exists and works — it just needs the backend call to succeed (fixed in step 2).

## Summary

- Add is_active Switch inside the UserForm edit dialog
- Fix the "Sesión inválida" error that blocks all user updates
- Keep the existing toggle button in the table row (it already calls the right function)

