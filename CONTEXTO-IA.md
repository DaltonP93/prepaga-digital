# CONTEXTO-IA — Historial de trabajo (sesión 2026-06)

> **Para qué sirve este archivo:** que cualquier IA o desarrollador que tome el proyecto
> entienda QUÉ se hizo, POR QUÉ, el ESTADO actual y lo PENDIENTE, sin tener que reconstruirlo.
> Optimizado para lectura por IA. Complementa a `CLAUDE.md` (guía general) y a `AGENTS.md`.
> Última actualización: **2026-06-23**. Rama de trabajo de la sesión: `claude/...` → merge a `main`.

---

## 0. Reglas críticas que NO se deben violar (leer primero)

1. **Deploy del frontend = reconstruir imagen Docker + redeploy en Portainer.** El proyecto
   **NO usa Lovable** (no mencionarlo). **Pushear a `main` NO pone los cambios en producción**;
   producción corre desde la imagen `samap-digital-2-prepaga-web` (Dockerfile → `npm run build`).
   Hasta que no se reconstruye/redespliega la imagen, en `prepaga.saa.com.py` se ve la versión vieja.
2. **NO tocar `supabase/functions/generate-base-pdf`** (administrada externamente, v82, estrategia
   thead/tfoot). Ver CLAUDE.md.
3. **Teléfonos paraguayos se guardan SIN el 0 inicial** (hay triggers que lo quitan).
4. **Fechas date-only: NUNCA `new Date("YYYY-MM-DD")`** (corre 1 día por timezone UTC-4). Parsear
   con `.split('-')`. (Bug conocido #1 de CLAUDE.md.)
5. **La `anon` key del front es pública** (protegida por RLS), no es secreto. La `service_role`
   NUNCA va al front ni a archivos versionados.

## 1. Identidad del proyecto (datos duros)

| Campo | Valor |
|---|---|
| Producto | SAMAP Prepaga Digital (React+TS+Vite+Tailwind+shadcn + Supabase) |
| Supabase project ref | `ejiycfqxgtrzaysgpzmx` (PROD, región sa-east-1, instancia **t4g.micro**) |
| Company ID (única empresa) | `0a1dc0e5-7378-4d14-b7bc-646b3e652bc6` |
| Frontend URL | https://prepaga.saa.com.py |
| Imagen Docker front | `samap-digital-2-prepaga-web:latest` (Dockerfile: node build → nginx) |
| Cliente Supabase front | `src/integrations/supabase/client.ts` |
| Motor de plantillas (activo) | `src/lib/enhancedTemplateEngine.ts` (variables `{{...}}` + `{{respuestas.X}}`) |

> Existe `.env.us` que apunta a OTRO proyecto (`ykducvvcjzdpoojxlsig`, "Seguro Digital 2 / EEUU").
> El build de producción default (`npm run build`) usa SIEMPRE prod (`ejiy`). Ver §2.5.

---

## 2. Qué se hizo en esta sesión (cronológico, agrupado por tema)

### 2.1 Fix RLS de `profiles` → 406 / pantalla en blanco (Bug Conocido #5)
- **Síntoma:** consola inundada de `406` en `/rest/v1/profiles`, "Gestionar Firma" no navegaba.
- **Causa:** un deploy dejó en `profiles` solo la política "select own" → leer el perfil de otro
  usuario (ej. el vendedor de una venta) devolvía 0 filas; con `.single()` PostgREST da 406.
- **Fix DB:** restauradas 3 políticas (`profiles_insert_own`, `profiles_select_same_company_or_admin`,
  `profiles_update_admin_same_company`) optimizadas con `(select auth.uid())`.
- **Fix front:** `useSale.ts`/`useSales.ts` leen el perfil del vendedor con `.maybeSingle()` (nunca
  `.single()`) y degradan con gracia. Commits: `b5056be`, docs `8c28922`/`7585734`/`6972cc5`.

### 2.2 Limpieza de warnings de performance (Bug Conocido #6) — solo categorías SEGURAS
Aplicado por SQL (MCP), behavior-preserving, sin pérdida de datos:
- **`auth_rls_initplan`** (eran 164 en ~78 tablas): se envolvió cada `auth.uid()` en
  `(select auth.uid())` vía `ALTER POLICY` (idempotente: unwrap `( SELECT auth.uid() AS uid)` y
  re-wrap). **Importante:** el `DO` block hay que correrlo por `execute_sql`, NO por
  `apply_migration` (esa capa rompe los backslashes del regex). Verificado: 0 políticas con
  `auth.uid()` desnudo.
- **`duplicate_index`** (eran 4): `DROP INDEX CONCURRENTLY` de los redundantes byte-idénticos,
  conservando el documentado (`audit_comments`: `_sale_id`/`_user_id`; `document_print_versions`:
  `idx_document_print_versions_document_id`/`_sale_id`).
- **`current_setting`** (2 políticas públicas por token de `signature_links`): envuelto en `(select ...)`.
- **NO se tocó** (a propósito, riesgosos): `unindexed_foreign_keys` (86), `unused_index` (34),
  `multiple_permissive_policies` (205). Warnings totales ~498 → ~326. Docs commit `4706f67`.

### 2.3 Firma anónima rota → `42501 permission denied for table profiles` (Bug Conocido #7)
- **Síntoma:** abrir `/firmar/{token}` válido mostraba "Enlace no válido"; consola `42501`.
- **Causa:** el firmante usa rol **`anon`**. La consulta de `sales` evalúa políticas RLS `{public}`
  ("Users can view company sales") que referencian `profiles` en un subquery. Postgres chequea el
  privilegio sobre `profiles` en tiempo de plan; `anon` había perdido el `GRANT SELECT` sobre
  `profiles`. (NO fue por el wrap de `auth.uid()`; el form desnudo falla igual.)
- **Fix (1 línea):** `GRANT SELECT ON public.profiles TO anon;` — seguro: RLS sigue devolviendo
  **0 filas** de `profiles` a `anon` (verificado). Docs commit `e54fbbd`.
- ⚠️ Si reaparece: re-aplicar ese GRANT.

### 2.4 "Disk IO Budget depleting" / CPU-RAM altas (Bug Conocido #8) — Realtime 24/7
- **Diagnóstico (pg_stat_statements):** la base estaba ocupada ~0,4% (NO sobrecargada). El mayor
  consumidor (~49%) era el **poller de Supabase Realtime leyendo el WAL** (`SELECT wal->>...`),
  activo mientras haya suscripciones. La instancia `t4g.micro` tiene baseline 87 Mbps + burst
  30 min/día; ese goteo drenaba el burst.
- **Causa raíz:** `useRealTimeNotifications` (en `NotificationCenter`, presente en TODAS las páginas)
  abre un canal con ~17 suscripciones `postgres_changes`; cualquier pestaña logueada abierta —aunque
  esté en segundo plano— mantenía Realtime sondeando 24 h. **Y además** el dev local pegaba a PROD
  (ver §2.5).
- **Fix (código, sin costo):** Realtime se **suelta cuando la pestaña está oculta**
  (`visibilitychange`) y se retoma al volver, en `useRealTimeNotifications.ts` y `SignatureWorkflow.tsx`;
  el polling de respaldo de SignatureWorkflow bajó 10s → 60s. Commits `5399c40`, `ac45606`.

### 2.5 Dev local pegaba a PRODUCCIÓN (Bug Conocido #9) — causa real del consumo 24/7
- **Causa:** `client.ts` tenía la URL/anon-key de prod **hardcodeadas** (no leía env). `npm run dev`
  local se conectaba a PROD → Realtime/polling a prod sin querer.
- **Fix:** `client.ts` usa prod hardcodeado en **cualquier `vite build`** y SOLO en `vite dev`
  (`import.meta.env.DEV`) permite override con `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`
  desde `.env.local`. **Imposible** que un build de prod apunte a otra base. Verificado en el bundle.
  Commits `fabdf56`, `576cdd7`. Para aislar dev: `supabase start` + `.env.local` (ya hay `config.toml`).

### 2.6 Cliente: ubicación NO bloqueante al crear cliente
- **Síntoma:** desde el celular no se podía avanzar; pedía ubicación/GPS.
- **Causa:** `ClientForm.tsx` exigía Ciudad/Departamento/Dirección/Barrio/coordenadas para crear
  cliente nuevo. **No hay GPS automático** (`requestPermissions` nunca se llama; solo el botón
  "Usar mi ubicación").
- **Fix:** la validación de ubicación ya **no bloquea** el guardado (campos opcionales); texto de la
  pestaña actualizado. Reversible (restaurar bloque `if (!isEditing) {...missingFields...}`).
  Commits `fb5a2ab`, `37d631d`.

### 2.7 Otros fixes menores (ya estaban en la rama)
- `378da23` sexo M/F en tabla de beneficiarios; `c3ed251` sincronizar teléfono en signature_links;
  `f47bfae`/`b48d6ca` variables `titular_*` usan `contratante` + responsable de pago; `a111f0a` DDJJ adherentes.
- **Reset de contraseña** de `cacosta.ma@gmail.com` (super_admin) por SQL con `crypt(..., gen_salt('bf'))`
  (NO se documenta el valor por seguridad).

### 2.8 ⭐ FEATURE PRINCIPAL: "Plan Materno" — campos manuales por template
**Objetivo:** un template especial cuyos campos que NO existen en el sistema (Id Cliente SAMAP,
Fecha probable de parto, Ginecólogo Pediatra, Cantidad de cuotas, Monto de la cuota) los completa
**el vendedor a mano** al cargar la venta, y salen en el PDF.

**Descubrimiento clave:** el sistema YA tenía casi todo el circuito:
- `template_questions` (define campos por template: `question_text`, `question_type`,
  `is_required`, `placeholder_name`, opciones) — se editan en el **QuestionBuilder** (pestaña
  "Preguntas" del editor de plantillas).
- `template_responses` (`sale_id`, `template_id`, `question_id`, `response_value`) — guarda lo que
  carga el vendedor; lo escribe `DynamicQuestionnaire.tsx`. (La DDJJ ya prueba que el vendedor
  autenticado puede escribir ahí.)
- El motor `enhancedTemplateEngine.ts` YA fusiona las respuestas en el documento vía
  `{{respuestas.<placeholder_name>}}` (lo arma `SaleTemplatesTab.tsx`).

**Lo único que faltaba: una UI para que el VENDEDOR llene esas preguntas en el flujo de venta**
(antes solo existía en la vista pública por token, `QuestionnaireView`). Eso es lo que se agregó.

**Cambios de código (en `main`):**
- `ae25ea5` — **`src/components/sale-form/SalePlanFieldsTab.tsx`** (NUEVO): pestaña "Campos del Plan".
  Reusa `DynamicQuestionnaire`. **100% aditiva e inerte:** solo lista templates de la venta que
  tengan preguntas. Wireada en `SaleTabbedForm.tsx` con un query `hasPlanFields` que SOLO muestra la
  pestaña si la venta usa un template (no-DDJJ) con preguntas → ventas normales quedan idénticas.
- `2553985` — **exclusión de la DDJJ de salud** (nombre contiene "ddjj" o "declaracion"+"salud") de
  esa pestaña, para no duplicar las 13 preguntas de salud (que tienen su propia pestaña DDJJ).
- `a488caf` — **campo `placeholder_name` en QuestionBuilder** (`+ useTemplateQuestions.ts`): define
  el nombre limpio del placeholder desde la UI (se sanitiza a `[a-z0-9_]`), sin SQL.
- `e37166d` — **tipo de pregunta `date`** (input `type=date`) en `DynamicQuestionnaire` + `QuestionBuilder`.
- `a565bd7` — al generar, las respuestas tipo `date` (guardadas `YYYY-MM-DD`) se muestran
  **dd/MM/yyyy** en el documento (helper `formatResponseValue` en `SaleTemplatesTab.tsx`, parseo por
  split para evitar el corrimiento de timezone). Solo aplica a preguntas tipo date.

**Objetos creados en la BASE (datos, no código):**
- Template **"Plan Materno"** — `id = 95b3d3ec-f570-4cb8-a173-01b3df696cdc`, company
  `0a1dc0e5-...`, `template_type='contrato'`, `designer_version='1.0'`, `render_engine='legacy'`,
  `requires_signature=true` (SE FIRMA), `is_active=true`. El cuerpo HTML está en `templates.content`
  con el plan FIJO ("Plan Materno", no `{{plan.nombre}}`), variables `{{cliente.nombre}}`,
  `{{venta.vendedor}}`, `{{fecha.actualFormateada}}`, los `{{respuestas.X}}`, y bloques de firma
  `{{firma_contratante}}`/`{{firma_contratada}}`.
- 5 `template_questions` (verificado: cada placeholder existe en el HTML):

  | question_text | question_type | placeholder_name |
  |---|---|---|
  | Id de Cliente SAMAP | text | `id_samap` |
  | Fecha probable de parto | **date** | `fecha_parto` |
  | Ginecólogo Pediatra | text | `gineco_pediatra` |
  | Cantidad de cuotas | number | `cant_cuotas` |
  | Monto de la cuota | number | `monto_cuota` |

**Flujo end-to-end esperado (post-deploy):** vendedor crea/edita venta → pestaña Templates: asigna
"Plan Materno" → aparece pestaña **"Campos del Plan"** → completa los 5 → **genera el documento
ANTES de enviar a firmar** (los valores se hornean en el PDF al generar) → se envía a firmar como
cualquier contrato.

---

## 3. ESTADO ACTUAL (a 2026-06-23)

- ✅ Todo el código en `origin/main` (HEAD `a565bd7`), working tree limpio.
- ✅ Verificado: `npm run build` OK, `tsc --noEmit` OK. ESLint solo arroja `no-explicit-any`, que es
  el **estilo pre-existente de TODO el repo** (no bloquea el build de Docker, no son errores de runtime).
- ✅ Base sana: 9 templates (sin duplicados), Plan Materno con 5 preguntas, DDJJ con sus 13 intacta,
  0 índices inválidos. Ningún dato existente fue modificado por el feature (solo se agregó).
- ⏳ **PENDIENTE (bloqueante para que se vea en prod):** **reconstruir y redesplegar la imagen Docker
  desde `main`.** El código nuevo (pestaña "Campos del Plan", tipo fecha, campo placeholder) NO está
  en vivo hasta ese paso.
- ⏳ **PENDIENTE (validación):** probar en una venta BORRADOR: asignar Plan Materno → cargar los 5 →
  generar PDF (confirmar que salen y la fecha es dd/MM/yyyy) → enviar a firmar (confirmar circuito).

---

## 4. Gotchas / notas para la próxima IA

- **No volver a sugerir "esperar deploy de Lovable".** Deploy = Docker rebuild (ver §0.1).
- Si reaparece `42501 permission denied for table profiles` en la firma pública → `GRANT SELECT ON
  public.profiles TO anon;` (§2.3).
- Si reaparecen warnings `auth_rls_initplan` (un deploy dejó `auth.uid()` desnudo) → re-aplicar el
  wrap por `execute_sql` (NO `apply_migration`) (§2.2).
- Si vuelve el consumo de Disk IO 24/7 → revisar que no quede una pestaña/`npm run dev` apuntando a
  prod, y que el pausado por `visibilitychange` siga en `useRealTimeNotifications`/`SignatureWorkflow`
  (§2.4, §2.5).
- Para más campos manuales en CUALQUIER template futuro: agregar `template_questions` (con
  `placeholder_name`) al template y poner `{{respuestas.<placeholder>}}` en el HTML. La pestaña
  "Campos del Plan" aparece sola (excepto para la DDJJ de salud, excluida a propósito).
- `CLAUDE.md` tiene Bugs Conocidos #1–#9 con el detalle y el SQL de restauración de cada uno.

---

## 5. Referencia de commits de la sesión (en `main`)

```
a565bd7 feat(ventas): formatear respuestas tipo fecha a dd/MM/yyyy en el documento
e37166d feat(templates): soporte de tipo de pregunta 'date' (campo fecha)
a488caf feat(templates): campo placeholder_name en el editor de preguntas
2553985 fix(ventas): excluir DDJJ de salud de la pestaña 'Campos del Plan'
ae25ea5 feat(ventas): pestaña 'Campos del Plan' para completar campos manuales por template
37d631d fix(clientes): actualizar texto de la pestaña Ubicación (ya no es obligatoria)
fb5a2ab fix(clientes): ubicación no bloqueante al crear cliente (permite cargar desde celular)
576cdd7 fix(dev): blindar override de Supabase URL a solo `vite dev` (build siempre = prod)
fabdf56 fix(dev): client.ts lee URL/key de env con fallback a prod (aislar dev de producción)
ac45606 perf: pausar Realtime cuando la pestaña está oculta (drenaba el Disk IO budget)
5399c40 perf: reducir polling de SignatureWorkflow de 10s a 60s y pausar si pestaña oculta
e54fbbd docs: bug #7 firma anonima 42501 permission denied for table profiles
4706f67 docs: limpieza de warnings de performance (initplan + duplicate_index) en bug #6
b5056be fix: cargar perfil del vendedor con maybeSingle para evitar 406 y página en blanco
```

(Cambios solo-DB de la sesión —sin commit— : políticas RLS de `profiles`, wrap initplan, drop de
índices duplicados, `GRANT SELECT ON profiles TO anon`, template Plan Materno + 5 preguntas,
reset de contraseña de cacosta. La fuente de verdad de estos es la BASE, no el repo.)
