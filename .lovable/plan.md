
# Plan: Sistema de Ventas SAMAP con Firma Digital

## Estado del Proyecto

### ✅ Fase 1: Migraciones de Base de Datos (COMPLETADO)

#### Nuevas Tablas Creadas
- [x] `document_types` - Catálogo de tipos de documentos
- [x] `document_packages` - Paquetes de documentos para envío conjunto
- [x] `document_package_items` - Documentos incluidos en cada paquete
- [x] `signature_links` - Enlaces únicos para firma digital
- [x] `signature_workflow_steps` - Estados del flujo de firma
- [x] `beneficiary_documents` - Documentos adjuntos de adherentes
- [x] `whatsapp_messages` - Registro de mensajes de WhatsApp
- [x] `sale_workflow_states` - Estados del flujo de venta

#### Modificaciones a Tablas Existentes
- [x] `beneficiaries` - Campos adicionales (document_type, gender, address, preexisting_conditions, etc.)
- [x] `sales` - Campos de workflow (contract_number, audit_status, auditor_id, etc.)
- [x] `documents` - Campos de firma y versiones
- [x] `templates` - Campos para generación dinámica

#### Funciones y Triggers
- [x] `generate_contract_number()` - Auto-genera número de contrato (formato YYYY-XXXXXX)
- [x] `check_all_signatures_completed()` - Verifica firmas completadas
- [x] `auto_advance_sale_status()` - Avanza estado de venta automáticamente
- [x] Actualización de `get_user_role()` para nuevos roles

#### Roles de Usuario
- [x] Agregados `supervisor` y `auditor` al enum `app_role`

---

### ✅ Fase 2: Sistema de Permisos Granular (COMPLETADO)

#### Archivos Creados
- [x] `src/types/roles.ts` - Tipos AppRole, RolePermissions, ROLE_PERMISSIONS
- [x] `src/hooks/useRolePermissions.ts` - Hook para verificar permisos (can, canAny, canAll)
- [x] `src/components/PermissionGate.tsx` - Componentes para control de acceso en UI

#### Roles Implementados (6 roles)
| Rol | Descripción |
|-----|-------------|
| super_admin | Control total del sistema, múltiples empresas |
| admin | Control completo de su empresa |
| supervisor | Gestión de planes, templates y reportes |
| auditor | Revisión y aprobación de ventas |
| gestor | Gestión de ventas y clientes (vista completa) |
| vendedor | Creación de ventas (solo propias) |

#### Uso de PermissionGate
```tsx
<PermissionGate resource="sales" action="create">
  <Button>Nueva Venta</Button>
</PermissionGate>

<AdminGate>
  <SettingsPanel />
</AdminGate>
```

---

### ✅ Fase 3: Componentes Core (COMPLETADO)

#### Componentes Creados/Mejorados
- [x] `BeneficiariesManager` - Formulario extendido con tabs (Datos Personales, Contacto, Salud)
- [x] `BeneficiaryForm` - Formulario completo con validación Zod
- [x] `BeneficiaryDocuments` - Gestión de documentos por beneficiario con upload
- [x] `DocumentPackageSelector` - Selector de paquetes de documentos para firma
- [x] `SignatureLinkGenerator` - Generador de enlaces únicos de firma
- [x] `EnhancedSignatureCanvas` - Canvas de firma con soporte táctil y deshacer
- [x] `AuditorDashboard` - Panel completo de auditoría con aprobación/rechazo

#### Hooks Creados
- [x] `useSignatureLinks` - CRUD completo para signature_links
- [x] `useRolePermissions` - Verificación de permisos por rol

---

### ✅ Fase 4: Integración WhatsApp (COMPLETADO)

#### Edge Functions Creadas
- [x] `send-whatsapp/index.ts` - Envío de mensajes vía WhatsApp Business API
- [x] `schedule-reminders/index.ts` - Recordatorios automáticos de firmas pendientes

#### Servicios y Hooks
- [x] `WhatsAppService.ts` - Servicio completo con templates de mensajes
- [x] `useWhatsAppService.ts` - Hook para envío de mensajes, recordatorios y notificaciones

#### Templates de Mensajes
- Enlace de Firma (`signature_link`)
- Cuestionario (`questionnaire`)
- Recordatorio (`reminder`)
- Aprobación (`approval`)
- Rechazo (`rejection`)
- General (`general`)

---

### ✅ Fase 5: Templates Dinámicos (COMPLETADO)

#### Motor de Templates Mejorado
- [x] `enhancedTemplateEngine.ts` - Motor con soporte para beneficiarios, loops y formateo

#### Componentes Nuevos
- [x] `EnhancedPlaceholdersPanel.tsx` - Panel de variables con búsqueda y categorías
- [x] `LiveTemplatePreview.tsx` - Vista previa en vivo con datos de prueba

#### Hooks de Generación PDF
- [x] `useEnhancedPDFGeneration.ts` - Hook mejorado para generación de documentos

#### Edge Function Actualizada
- [x] `generate-pdf/index.ts` - Generación PDF con interpolación de variables y tabla de beneficiarios

#### Variables Disponibles
- Cliente: nombre, apellido, email, teléfono, DNI, dirección, edad
- Plan: nombre, precio, descripción, cobertura
- Empresa: nombre, email, teléfono, dirección
- Venta: fecha, total, vendedor, contrato, estado
- Firma: enlace, token, expiración
- Fecha: actual, formateada, año, mes, día
- Beneficiarios: loop con datos completos de cada adherente

---

### ✅ Fase 6: Integraciones Finales (COMPLETADO)

#### Storage
- [x] Bucket `documents` privado con políticas RLS por company_id

#### Página de Firma Pública
- [x] `useSignatureLinkPublic.ts` - Hook para firma pública con signature_links
- [x] `SignatureView.tsx` - Página mejorada con EnhancedSignatureCanvas

#### SaleDetail Mejorado
- [x] Tabs de Paquetes de Documentos
- [x] Tab de Generación de Enlaces de Firma
- [x] Tab de WhatsApp Notifications

#### Editor de Templates Mejorado
- [x] Integración de EnhancedPlaceholdersPanel
- [x] LiveTemplatePreview con vista desktop/mobile/print
- [x] Generación PDF desde vista previa

---

### ✅ Fase 7: Seguridad Avanzada de Contraseñas (COMPLETADO)

#### Implementación Propia (Alternativa a Supabase Pro)
- [x] `usePasswordSecurity.ts` - Hook para verificación contra HaveIBeenPwned API (k-anonymity)
- [x] `PasswordStrengthIndicator.tsx` - Componente visual de fortaleza de contraseña
- [x] Integración en `Register.tsx` - Validación al crear cuenta
- [x] Integración en `SecuritySettings.tsx` - Validación al cambiar contraseña

#### Características
- Verificación de contraseñas filtradas usando API pública de HaveIBeenPwned
- Evaluación de fortaleza (mayúsculas, minúsculas, números, símbolos)
- Detección de patrones comunes (123456, qwerty, etc.)
- Indicador visual con barra de progreso y feedback en tiempo real
- Bloqueo de registro/cambio si la contraseña está comprometida

---

## ✅ Sistema 100% Completo

Todos los módulos están implementados y funcionales:

1. **Autenticación** - Login, registro, recuperación de contraseña, validación de contraseñas filtradas
2. **Gestión de Ventas** - CRUD completo con workflow de estados, auto-cálculo de montos, empresa fija
3. **Firma Digital** - Enlaces únicos, canvas mejorado, flujo completo, realtime updates
4. **Beneficiarios** - Datos extendidos, documentos, firmas múltiples
5. **Templates** - Editor visual, variables dinámicas, vista previa en vivo, DDJJ integrada
6. **WhatsApp** - Notificaciones, recordatorios, templates de mensajes
7. **Email** - Notificaciones via Resend (send-notification edge function)
8. **Auditoría** - Panel de auditor, aprobación/rechazo, trazabilidad
9. **Permisos** - 6 roles con control granular de acceso
10. **Storage** - Bucket privado con RLS por company_id
11. **Seguridad** - Validación HaveIBeenPwned, fortaleza de contraseñas
12. **DDJJ → Templates** - Preguntas de salud sincronizadas con template_responses para interpolación
13. **Realtime** - Suscripciones en tiempo real para actualización de firmas
14. **Reenvío** - Regeneración de enlaces expirados con revocación automática del anterior
15. **Auto-advance** - Trigger activo que avanza la venta a 'firmado' cuando todas las firmas completan

---

## 🔧 Configuración Opcional (Usuario)

1. **WhatsApp API**: Configurar `whatsapp_api_key` y `whatsapp_phone_id` en `company_settings`
2. **Email**: Secret `RESEND_API_KEY` ya configurado para envío de notificaciones

---

Ver archivo completo: `.lovable/analisis_mejoras_sistema_firma_digital.md`

---

## Historial de Cambios Anteriores

### Corrección de Estado de Carga de Autenticación
Se eliminaron las verificaciones redundantes de `loading` que causaban bloqueos:
1. **Layout.tsx** - Eliminada verificación de loading
2. **MainLayout.tsx** - Eliminada verificación de loading
3. **ProtectedRoute.tsx** - Eliminado useSessionManager
4. **SimpleProtectedRoute.tsx** - Optimizado con useMemo
