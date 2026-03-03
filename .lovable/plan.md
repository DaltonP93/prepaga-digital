

## Problem Diagnosis

The error "Edge Function returned a non-2xx status code" occurs because:

1. **`selectedChannel` defaults to `'email'`** in `SignatureView.tsx` (line 39)
2. Your OTP policy for this company only allows `['whatsapp']` as a channel
3. When the policy loads via `fetchPolicy`, the `selectedChannel` state is **never updated** to match `default_channel: 'whatsapp'`
4. The Edge Function correctly rejects the request: `"Canal email no permitido"` (HTTP 400)

The channel selector UI is also hidden when only one channel is allowed (`allowed_channels.length > 1`), so the user can't manually switch.

## Plan

### 1. Auto-sync `selectedChannel` with OTP policy default (SignatureView.tsx)

Add a `useEffect` that updates `selectedChannel` when `verification.otpPolicy` loads:

```ts
useEffect(() => {
  if (verification.otpPolicy?.default_channel) {
    setSelectedChannel(verification.otpPolicy.default_channel);
  }
}, [verification.otpPolicy]);
```

### 2. Fallback in sendOTP call

Update the button's `onClick` to use the policy's default channel as fallback instead of relying solely on `selectedChannel`:

```ts
const effectiveChannel = verification.otpPolicy?.allowed_channels?.includes(selectedChannel)
  ? selectedChannel
  : verification.otpPolicy?.default_channel || selectedChannel;
```

### 3. Phone normalization for OTP

Ensure the phone passed to `sendOTP` has the `+595` prefix prepended when not present, matching the normalization done in `ClientForm`:

```ts
const normalizedPhone = phone && !phone.startsWith('+') ? `+595${phone}` : phone;
```

This is needed because the client's phone is stored as `992974616` (without prefix), but the WAHA gateway needs the full international number.

### Files Changed
- `src/pages/SignatureView.tsx` — 3 small edits (useEffect + channel logic + phone normalization)

