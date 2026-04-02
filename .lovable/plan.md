

# Plan: Health Check automático de WAHA con alertas

## Resumen
Crear una Edge Function `waha-health-check` que verifique el estado de la sesión WAHA periódicamente, y un componente en el panel de administración que muestre el estado en tiempo real y permita ejecutar chequeos manuales. Cuando la sesión se caiga, se registra una alerta en la base de datos y se puede notificar por email.

## Cambios a implementar

### 1. Tabla `waha_health_logs` (migración SQL)
- Columnas: `id`, `company_id`, `session_status` (text: WORKING, STOPPED, FAILED, SCAN_QR_CODE, UNKNOWN), `response_time_ms`, `error_message`, `checked_at`, `created_at`
- RLS: lectura para admin/super_admin de la misma empresa

### 2. Edge Function `waha-health-check`
- Recibe `company_id` (opcional, si no se envía chequea todas las empresas con WAHA configurado)
- Para cada empresa con provider `waha` o `qr_session`:
  - Llama a `GET {gateway_url}/api/sessions/default` con el `X-Api-Key`
  - Registra resultado en `waha_health_logs`
  - Si el estado NO es `WORKING`, envía notificación por email al admin usando la Edge Function `send-notification` existente
- Retorna resumen de estados chequeados

### 3. Hook `useWahaHealthCheck`
- Query que obtiene los últimos health checks de la empresa
- Mutation para ejecutar un chequeo manual llamando a la Edge Function
- Polling cada 5 minutos (configurable) usando `refetchInterval`

### 4. Componente `WahaHealthStatus` en AdminConfigPanel
- Indicador visual (badge verde/rojo/amarillo) del estado de la sesión WAHA
- Último chequeo (timestamp relativo)
- Botón "Verificar ahora" para chequeo manual
- Historial breve de los últimos 5 chequeos
- Solo visible cuando el proveedor seleccionado es `waha` o `qr_session`

### 5. Registrar en `supabase/config.toml`
- `[functions.waha-health-check]` con `verify_jwt = false`

## Archivos a crear/modificar
- **Nueva migración SQL**: tabla `waha_health_logs`
- **Nuevo**: `supabase/functions/waha-health-check/index.ts`
- **Nuevo**: `src/hooks/useWahaHealthCheck.ts`
- **Nuevo**: `src/components/WahaHealthStatus.tsx`
- **Modificar**: `src/components/AdminConfigPanel.tsx` (integrar componente)
- **Modificar**: `supabase/config.toml` (agregar función)

