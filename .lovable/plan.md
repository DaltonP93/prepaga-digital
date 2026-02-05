
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

### 🔲 Fase 4: Integración WhatsApp (PENDIENTE)

- [ ] Configurar API de WhatsApp Business
- [ ] Crear edge function para envío de mensajes
- [ ] Implementar WhatsAppService con templates
- [ ] Sistema de recordatorios automáticos

---

### 🔲 Fase 5: Templates Dinámicos (PENDIENTE)

- [ ] Editor de templates mejorado con placeholders
- [ ] Sistema de variables dinámicas
- [ ] Generación automática de PDFs
- [ ] Vista previa de documentos

---

## Documentación de Referencia

Ver archivo completo: `.lovable/analisis_mejoras_sistema_firma_digital.md`

---

## Notas de Seguridad

⚠️ **Leaked Password Protection**: Habilitar en el dashboard de Supabase
- Ir a: Authentication > Settings > Password Protection
- Activar: "Enable Leaked Password Protection"

---

## Historial de Cambios Anteriores

### Corrección de Estado de Carga de Autenticación
Se eliminaron las verificaciones redundantes de `loading` que causaban bloqueos:
1. **Layout.tsx** - Eliminada verificación de loading
2. **MainLayout.tsx** - Eliminada verificación de loading
3. **ProtectedRoute.tsx** - Eliminado useSessionManager
4. **SimpleProtectedRoute.tsx** - Optimizado con useMemo
