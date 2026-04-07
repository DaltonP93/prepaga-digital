

## Plan: Integrate WAHA Connect Panel with Edge Function proxy

### What this does
Adds a full WAHA session management panel (QR code, start/stop/reconnect, status, messages preview) to Configuración → Integraciones → WhatsApp, replacing the current static config fields when provider is `waha`. All WAHA API calls go through a secure Edge Function so the API key is never exposed in the browser.

### Architecture

```text
Browser (WahaConnectPanel)
  ↓ supabase.functions.invoke('waha-proxy', { action, ... })
  ↓
Edge Function: waha-proxy
  → reads company_settings (whatsapp_gateway_url, whatsapp_api_key)
  → proxies to WAHA API (sessions, auth/qr, messages)
  ↓
Response back to browser
```

### Changes

**1. New Edge Function: `supabase/functions/waha-proxy/index.ts`**
- Authenticated endpoint (validates JWT via `getClaims`)
- Reads `whatsapp_gateway_url` and `whatsapp_api_key` from `company_settings` for the user's `company_id`
- Supports actions:
  - `get_sessions` → GET `/api/sessions`
  - `get_session` → GET `/api/sessions/{name}`
  - `create_session` → POST `/api/sessions`
  - `start_session` → POST `/api/sessions/{name}/start`
  - `stop_session` → POST `/api/sessions/{name}/stop`
  - `logout_session` → POST `/api/sessions/{name}/logout`
  - `get_qr` → GET `/api/{name}/auth/qr`
  - `get_messages` → GET `/api/messages?limit=20`
- Returns WAHA response JSON to the client

**2. New component: `src/components/WahaConnectPanel.tsx`**
- Adapted from the uploaded file but replaces all direct `fetch` calls with `supabase.functions.invoke('waha-proxy', { body: { action, session_name } })`
- No `wahaUrl` or `apiKey` props needed — the Edge Function handles credentials
- Props: `sessionName`, `linkedPhone`, `onLinked`, `onStatusChange`
- Reads config from the existing `useCompanyApiConfiguration` hook
- Shows: session status badge, QR code area, start/stop/reconnect buttons, linked phone info, optional messages preview
- Uses existing UI components (Card, Badge, Button, Alert, Switch, ScrollArea, Separator)

**3. Update: `src/components/AdminConfigPanel.tsx`**
- When `whatsapp_provider === 'waha'`, render `<WahaConnectPanel>` below the existing WAHA config fields (URL, API Key, phone)
- Replace the current `<WahaHealthStatus />` with the new panel (which already includes status monitoring)
- Pass `linkedPhone` from `apiFormData.whatsapp_linked_phone` and wire `onLinked` to update the phone in config

**4. Update: `supabase/config.toml`**
- Add `waha-proxy` function entry with `verify_jwt = false`

### Security
- API key stays server-side in `company_settings` and the Edge Function
- JWT validation ensures only authenticated users from the correct company can manage sessions
- `company_id` is derived from the user's profile, not from the request body

