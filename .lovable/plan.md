

# Plan: Ampliar Realtime para reflejar cambios sin recargar

## Diagnóstico

El hook `useRealTimeNotifications` (usado en `NotificationCenter` → `MainLayout`) escucha solo 7 tablas: `notifications`, `sales`, `documents`, `signature_links`, `signature_workflow_steps`, `beneficiaries`, `sale_templates`, `audit_processes`.

**Tablas sin cobertura realtime** que los usuarios modifican frecuentemente:
- `clients` → query key `['clients']`
- `templates` → query key `['templates']`
- `plans` → query key `['plans']`
- `profiles` → query key `['users']`, `['profile']`
- `companies` → query key `['companies']`
- `sale_requirements` → query key `['sale-requirements']`
- `sale_notes` → query key `['sale-notes']`

Nota: `incidents` ya tiene su propio canal realtime dentro de `useIncidents.ts`, así que no se duplica.

## Cambio

**Archivo:** `src/hooks/useRealTimeNotifications.ts`

Agregar listeners `.on('postgres_changes', ...)` para las tablas faltantes, invalidando sus query keys correspondientes. Cada listener sigue el mismo patrón existente:

| Tabla | Evento | Query keys a invalidar |
|---|---|---|
| `clients` | `*` | `['clients']` |
| `templates` | `*` | `['templates']`, `['templates-for-selection']` |
| `plans` | `*` | `['plans']` |
| `profiles` | `*` | `['users']`, `['profile']` |
| `companies` | `*` | `['companies']` |
| `sale_requirements` | `*` | `['sale-requirements']` |
| `sale_notes` | `*` | `['sale-notes']` |

Esto garantiza que cuando otro usuario (o el mismo usuario en otra pestaña) modifica un cliente, template, plan, etc., la UI se actualiza automáticamente sin recargar.

No se modifica ningún otro archivo. No cambia diseño ni UX.

