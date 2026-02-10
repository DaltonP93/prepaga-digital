# Informe Técnico Completo - Prepaga Digital

Fecha: 2026-02-10
Repositorio: `c:\Users\LENOVO THINKBOOK\.gemini\antigravity\scratch\samap`

## 1) Resumen Ejecutivo

El proyecto actual es una aplicación **frontend SPA en React + Vite + TypeScript** con backend desacoplado en **Supabase** (PostgreSQL + Auth + Storage + Edge Functions).  
No se observan archivos de servidor Node/Express activos en la implementación actual (aunque el `README.md` describe una arquitectura previa Node/Express, hoy desactualizada frente al código real).

### Stack real detectado
- Frontend: React 18, React Router, React Hook Form, TanStack Query, Tailwind, shadcn/ui, Radix UI
- Estado/queries: TanStack Query + hooks por dominio
- Auth: Supabase Auth (provider principal: `SimpleAuthProvider`)
- Base de datos: Supabase PostgreSQL tipada vía `src/integrations/supabase/types.ts`
- Backend serverless: Supabase Edge Functions (11 funciones)
- Extras: Stripe (pagos/suscripción), Resend (emails), WhatsApp/SMS campaigns, generación PDF, capacidades móviles vía Capacitor

## 2) Inventario General del Código

### Conteo
- Páginas (`src/pages`): **36**
- Componentes raíz (`src/components`, solo archivos directos): **104**
- Hooks (`src/hooks`): **75**
- Edge Functions (`supabase/functions`): **11**
- Migraciones SQL (`supabase/migrations`): **58**

### Estructura principal
- `src/components`
- `src/hooks`
- `src/pages`
- `src/integrations/supabase`
- `supabase/functions`
- `supabase/migrations`

## 3) Módulos Funcionales (negocio)

### 3.1 Comercial / Ventas
- Páginas: `Sales.tsx`, `SaleDetail.tsx`, `SaleEdit.tsx`, `NewSale.tsx`, `SaleForm.tsx`
- Hooks: `useSales.ts`, `useSale.ts`, `useSaleTemplates.ts`
- Componentes: `SaleForm.tsx`, `SaleDetails.tsx`, `SaleDocuments.tsx`, `SaleNotes.tsx`, `SaleRequirements.tsx`, `SalesActionButtons.tsx`
- Capacidades:
  - gestión de ventas por estado
  - vinculación con clientes/planes/templates
  - links de firma/cuestionario
  - notas, requisitos y documentos asociados

### 3.2 Clientes
- Páginas/componentes: `Clients.tsx`, `ClientsList.tsx`, `ClientForm.tsx`, `ClientDetails.tsx`
- Hook: `useClients.ts`
- Capacidades:
  - alta/edición/baja de clientes
  - soporte de geocoordenadas (`latitude`, `longitude`)
  - resolución de `company_id` para RLS

### 3.3 Planes
- Página: `Plans.tsx`
- Hook: `usePlans.ts`
- Componentes: `PlanForm.tsx`

### 3.4 Templates y Documentación contractual
- Páginas: `Templates.tsx`, `TemplateDetail.tsx`, `TemplateEdit.tsx`
- Hooks: `useTemplates.ts`, `useTemplateQuestions.ts`, `useTemplateResponses.ts`, `useTemplateVersioning.ts`, `useTemplateWorkflow.ts`, `useTemplateAnalytics.ts`, `useTemplatePlaceholders.ts`
- Componentes clave:
  - `TemplateForm.tsx`
  - `TemplateDesigner.tsx`
  - `VisualTemplateEditor.tsx`
  - `QuestionBuilder.tsx`
  - `VersionControlPanel.tsx`
  - `LiveTemplatePreview` (en carpeta `templates`)
- Capacidades:
  - diseñador de templates
  - placeholders/variables dinámicas
  - preguntas y respuestas asociadas
  - versionado y preview

### 3.5 Firmas digitales / Workflow
- Páginas: `SignatureWorkflow.tsx`, `SignatureView.tsx`
- Hooks: `useSignature.ts`, `useSignatureLinks.ts`, `useSignatureFlow.ts`, `useSignatureAutomation.ts`, `useSignatureLinkPublic.ts`
- Componentes: `SignatureCanvas.tsx`, `SignatureWorkflowManager.tsx`, `SignatureProcessFlow.tsx`, `SignatureProgress.tsx`

### 3.6 Auditoría y trazabilidad
- Página: `AuditDashboard.tsx`
- Hooks: `useAuditProcess.ts`, `useAuditLog.ts`, `useAuditLogger.ts`, `useProcessTraces.ts`
- Componentes: `AuditDashboard.tsx`, `AuditLogViewer.tsx`, `AuditSaleDetails.tsx`

### 3.7 Comunicación (email/SMS/WhatsApp)
- Páginas/componentes: `Communications.tsx`, `CommunicationManager.tsx`, `WhatsAppNotificationPanel.tsx`
- Hooks: `useCommunications.ts`, `useNotifications.ts`, `useWhatsAppNotifications.ts`, `useWhatsAppService.ts`
- Integración backend vía edge functions (campañas y notificaciones)

### 3.8 Analytics y dashboard
- Páginas: `Dashboard.tsx`, `Analytics.tsx`
- Hooks: `useDashboard.ts`, `useDashboardWidgets.ts`
- Componentes: `DashboardWidgets.tsx`, `AdvancedAnalytics.tsx`, `widgets/*`

### 3.9 Configuración / UX / Branding / Sistema
- Páginas: `Settings.tsx`, `Experience.tsx`, `Profile.tsx`
- Componentes:
  - `CurrencyConfigurationPanel.tsx`
  - `ProfileCompanyAssignmentPanel.tsx`
  - `SessionConfigurationPanel.tsx`
  - `CacheMonitor.tsx`
  - `SystemOptimizationPanel.tsx`
  - `BrandingManager.tsx` / `CompanyBrandingForm.tsx`

### 3.10 Empresas y usuarios
- Páginas: `Companies.tsx`, `Users.tsx`
- Hooks: `useCompanies.ts`, `useUsers.ts`, `usePermissions.ts`, `useRolePermissions.ts`
- Componentes: `UserForm.tsx`, `CompanyForm.tsx`, `PermissionManager.tsx`

### 3.11 Pagos
- Páginas: `PaymentSuccess.tsx`, `PaymentCanceled.tsx`
- Hook: `usePayments.ts`
- Edge functions Stripe: `create-payment`, `create-subscription`

### 3.12 Documentos/PDF/Archivos
- Páginas: `Documents.tsx`, `FileManagement.tsx`
- Hooks: `useDocuments.ts`, `usePDFGeneration.ts`, `useEnhancedPDFGeneration.ts`, `useHybridPDFGeneration.ts`, `useFileManager.ts`, `useFileUpload.ts`
- Edge functions: `generate-pdf`, `file-manager`

## 4) Ruteo de la Aplicación

Rutas detectadas en `src/App.tsx`:
- Públicas:
  - `/login`
  - `/firmar/:token`
- Protegidas:
  - `/dashboard`
  - `/sales`
  - `/sales/new`
  - `/sales/:id`
  - `/sales/:id/edit`
  - `/clients`
  - `/plans`
  - `/documents`
  - `/templates`
  - `/templates/:id`
  - `/templates/:id/edit`
  - `/signature-workflow`
  - `/signature-workflow/:saleId`
  - `/analytics`
  - `/profile`
  - `/users`
  - `/companies`
  - `/audit`
  - `/settings`
  - `/experience`
  - `*` (NotFound)
- Redirección:
  - `/` -> `/dashboard`

## 5) Navegación y Permisos

Fuente: `src/components/AppSidebar.tsx` + `src/hooks/useRoutePermissions.ts`

### Menú principal
- Dashboard, Ventas, Clientes, Planes, Documentos, Templates, Flujo de Firmas, Analytics, Mi Perfil

### Menú administrativo
- Usuarios (super_admin o supervisor)
- Empresas (super_admin)
- Auditoría (super_admin, admin, supervisor, auditor)
- Configuración (`/settings`) (actualmente visible para todos los roles autenticados)

### Nota
- `/experience` existe y está restringida a `super_admin/admin` en el permiso `canViewExperience`.

## 6) Base de Datos (Supabase)

Fuente: `src/integrations/supabase/types.ts`

### 6.1 Tablas detectadas (46)
- `audit_logs`
- `audit_processes`
- `auth_attempts`
- `beneficiaries`
- `beneficiary_documents`
- `clients`
- `communication_logs`
- `companies`
- `company_currency_settings`
- `company_settings`
- `company_ui_settings`
- `countries`
- `dashboard_widgets`
- `document_access_logs`
- `document_package_items`
- `document_packages`
- `document_types`
- `documents`
- `email_campaigns`
- `email_templates`
- `file_uploads`
- `information_requests`
- `notifications`
- `password_reset_tokens`
- `plans`
- `process_traces`
- `profiles`
- `sale_documents`
- `sale_notes`
- `sale_requirements`
- `sale_templates`
- `sale_workflow_states`
- `sales`
- `signature_links`
- `signature_workflow_steps`
- `signatures`
- `sms_campaigns`
- `template_analytics`
- `template_comments`
- `template_placeholders`
- `template_question_options`
- `template_questions`
- `template_responses`
- `template_versions`
- `template_workflow_states`
- `templates`
- `user_roles`
- `whatsapp_messages`
- `whatsapp_notifications`

### 6.2 Funciones SQL expuestas en tipos
- `check_all_signatures_completed(p_sale_id)`
- `get_user_company_id(_user_id)`
- `get_user_role(_user_id)`
- `has_role(_user_id, _role)`

### 6.3 Enums
- `app_role`: `super_admin`, `admin`, `gestor`, `vendedor`, `supervisor`, `auditor`
- `document_status`: `pendiente`, `firmado`, `vencido`
- `sale_status`: `borrador`, `enviado`, `firmado`, `completado`, `cancelado`, `pendiente`, `en_auditoria`

### 6.4 Migraciones
- Total detectadas: **58** archivos SQL
- Incluyen cambios recientes relevantes:
  - `20260210120000_super_admin_bypass_rls.sql`
  - `20260210130000_add_branding_columns.sql`
  - `20260210143000_add_client_coordinates.sql`
  - `20260211000000_company_workflow_config.sql`

## 7) Edge Functions (Serverless Backend)

Detectadas en `supabase/functions`:
1. `api`  
   - API con validación por `x-api-key` contra `company_settings`.
2. `create-payment`  
   - Crea checkout de pago único en Stripe.
3. `create-subscription`  
   - Crea checkout de suscripción en Stripe.
4. `create-user`  
   - Alta de usuarios, reset password, bootstrap de primer `super_admin`.
5. `file-manager`  
   - Operaciones de archivos (upload/list/delete/signed-url) en storage.
6. `generate-pdf`  
   - Generación de PDF a partir de HTML/template/sale.
7. `schedule-reminders`  
   - Programación/envío de recordatorios de firma.
8. `send-email-campaign`  
   - Campañas email (Resend + logs).
9. `send-notification`  
   - Notificaciones transaccionales (email).
10. `send-sms-campaign`  
    - Campañas SMS (con logging).
11. `send-whatsapp`  
    - Mensajería WhatsApp con soporte de flujos de firma/recordatorio.

## 8) Hooks (inventario completo)

`use-mobile.tsx`, `use-toast.ts`, `useAuditLog.ts`, `useAuditLogger.ts`, `useAuditProcess.ts`, `useAuth.tsx`, `useAuthNotifications.ts`, `useBeneficiaries.ts`, `useBranding.ts`, `useCacheManager.ts`, `useClients.ts`, `useCombinedRequest.ts`, `useCommunications.ts`, `useCompanies.ts`, `useCompanyApiConfiguration.ts`, `useCompanyConfiguration.ts`, `useCompanySettings.ts`, `useCompanyUISettings.ts`, `useCurrencySettings.ts`, `useDashboard.ts`, `useDashboardWidgets.ts`, `useDocuments.ts`, `useDocumentTracking.ts`, `useEnhancedPDFGeneration.ts`, `useExport.ts`, `useFileManager.ts`, `useFileUpload.ts`, `useHybridPDFGeneration.ts`, `useLoginSecurity.ts`, `useMobile.ts`, `useNotifications.ts`, `useOffline.ts`, `useOptimizedProfile.ts`, `useOptimizedQueries.ts`, `usePasswordReset.ts`, `usePasswordSecurity.ts`, `usePayments.ts`, `usePDFGeneration.ts`, `usePermissions.ts`, `usePlans.ts`, `useProcessTraces.ts`, `useProfile.ts`, `useProfileCompletion.ts`, `usePushNotifications.ts`, `useRealTimeNotifications.ts`, `useRetryLogic.ts`, `useRolePermissions.ts`, `useRoutePermissions.ts`, `useSale.ts`, `useSales.ts`, `useSaleTemplates.ts`, `useSessionManager.ts`, `useSignature.ts`, `useSignatureAutomation.ts`, `useSignatureFlow.ts`, `useSignatureLinkPublic.ts`, `useSignatureLinks.ts`, `useSimpleAuditProcess.ts`, `useSimpleAuth.tsx`, `useSimpleProcessTraces.ts`, `useSmartCache.ts`, `useStateTransition.ts`, `useSystemStatus.ts`, `useTemplateAnalytics.ts`, `useTemplatePlaceholders.ts`, `useTemplateQuestions.ts`, `useTemplateResponses.ts`, `useTemplates.ts`, `useTemplateVersioning.ts`, `useTemplateWorkflow.ts`, `useTestData.ts`, `useUsers.ts`, `useWhatsAppNotifications.ts`, `useWhatsAppService.ts`, `useWorkflowConfig.ts`.

## 9) Páginas (inventario completo)

`Analytics.tsx`, `AuditDashboard.tsx`, `Clients.tsx`, `CombinedRequest.tsx`, `Communications.tsx`, `Companies.tsx`, `Dashboard.tsx`, `Documents.tsx`, `Experience.tsx`, `FileManagement.tsx`, `ForgotPassword.tsx`, `Index.tsx`, `Login.tsx`, `NewSale.tsx`, `NotFound.tsx`, `PaymentCanceled.tsx`, `PaymentSuccess.tsx`, `Plans.tsx`, `Profile.tsx`, `QuestionnaireView.tsx`, `Register.tsx`, `ResetPassword.tsx`, `SaleDetail.tsx`, `SaleEdit.tsx`, `SaleForm.tsx`, `Sales.tsx`, `Settings.tsx`, `SignatureView.tsx`, `SignatureWorkflow.tsx`, `SimpleLogin.tsx`, `TemplateDetail.tsx`, `TemplateEdit.tsx`, `Templates.tsx`, `TwoFactorAuth.tsx`, `Users.tsx`, `VerifyEmail.tsx`.

## 10) Seguridad y Gobierno de Acceso

### Implementación observada
- Provider principal: `SimpleAuthProvider`.
- Rutas protegidas vía `SimpleProtectedRoute`.
- Matriz de permisos por rol en `useRoutePermissions.ts`.
- Multi-tenant por `company_id` + RLS (se ve en mensajes y panel de asignación de empresa a perfiles).

### Observaciones
- Existe `AuthProvider` legado en código, pero la app usa `SimpleAuthProvider`. Mezclar hooks de ambos rompe ejecución (ejemplo ya corregido en `useTestData`).
- API key en edge function `api` se valida en tabla (`email_api_key`), con comentario de endurecimiento (hash recomendado).
- Hay funciones con `Access-Control-Allow-Origin: *` y algunas lógicas simuladas en campañas (SMS por ejemplo), a revisar antes de producción estricta.

## 11) Estado Operativo y Calidad

### Build
- `npm run build` compila en estado actual.

### Riesgos técnicos detectados
1. **Divergencia documental**: `README.md` no refleja la arquitectura real (habla de Node/Express MVC clásico).  
2. **Volumen de bundle**: Vite avisa chunks > 500KB; conviene code splitting adicional.  
3. **Complejidad alta**: muchos hooks/componentes por dominio, conviene mapa ADR/arquitectura y estandarización por bounded contexts.  
4. **Superposición de auth**: coexistencia de `AuthProvider` y `SimpleAuthProvider` puede generar regressions si se mezclan hooks.

## 12) Recomendaciones Prioritarias

### Alta prioridad
1. Actualizar `README.md` y documentación técnica a la arquitectura real.  
2. Estandarizar un único provider de autenticación (deprecar oficialmente `AuthProvider` legado).  
3. Crear documento de dominio por módulo (Ventas, Templates, Firma, Comunicación, Auditoría).  
4. Endurecer seguridad edge functions (CORS por ambiente, validaciones y hashing de API keys).  

### Media prioridad
1. Modularizar el sistema de templates/workflow con límites de contexto más claros.  
2. Optimizar bundle con `manualChunks` y lazy loading adicional en rutas pesadas.  
3. Dashboard de observabilidad técnica (errores, tiempos edge function, métricas de DB).

## 13) Conclusión

El sistema está **ampliamente funcional y modularizado por dominio**, con una base de datos rica y una capa serverless robusta en Supabase.  
Su principal deuda actual no es de funcionalidad core, sino de **estandarización arquitectónica, documentación y hardening de algunos flujos de seguridad/operación**.

