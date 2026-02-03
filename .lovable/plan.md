
# Plan: Restaurar Base de Datos Prepaga Digital

## Resumen
Crear todas las tablas, tipos y funciones del backup en la base de datos Supabase conectada. El codigo frontend ya esta preparado para este esquema.

## Esquema de Base de Datos

### ENUMs a Crear
| ENUM | Valores |
|------|---------|
| user_role | super_admin, admin, gestor, vendedor |
| sale_status | borrador, enviado, firmado, completado, cancelado, pendiente, en_auditoria |
| document_status | pendiente, firmado, vencido |

### Tablas Principales (32 tablas)

**Gestion de Usuarios y Empresas:**
- `companies` - Empresas del sistema con branding personalizado
- `profiles` - Perfiles de usuarios vinculados a auth.users
- `company_settings` - Configuracion API (WhatsApp, SMS, Email)
- `company_currency_settings` - Configuracion de moneda
- `company_ui_settings` - Personalizacion de UI
- `countries` - Catalogo de paises

**Gestion de Ventas:**
- `clients` - Clientes con datos personales
- `plans` - Planes de prepaga/seguros
- `sales` - Ventas/contratos principales
- `beneficiaries` - Beneficiarios de cada venta
- `sale_templates` - Templates asignados a ventas
- `sale_documents` - Documentos subidos a ventas
- `sale_notes` - Notas internas de ventas
- `sale_requirements` - Requisitos pendientes

**Sistema de Templates y Firmas:**
- `templates` - Templates de contratos/documentos
- `template_placeholders` - Variables para templates
- `template_questions` - Preguntas de cuestionarios
- `template_question_options` - Opciones de respuesta
- `template_responses` - Respuestas de clientes
- `template_versions` - Historial de versiones
- `template_workflow_states` - Estados de workflow
- `template_analytics` - Metricas de uso
- `template_comments` - Comentarios colaborativos
- `documents` - Documentos generados
- `signatures` - Firmas digitales

**Comunicaciones:**
- `email_campaigns` - Campanas de email
- `email_templates` - Templates de email
- `sms_campaigns` - Campanas SMS
- `whatsapp_notifications` - Notificaciones WhatsApp
- `communication_logs` - Registro de comunicaciones

**Sistema y Auditoria:**
- `audit_logs` - Registro de cambios
- `audit_processes` - Procesos de auditoria
- `auth_attempts` - Intentos de login
- `notifications` - Notificaciones in-app
- `dashboard_widgets` - Configuracion de widgets
- `file_uploads` - Archivos subidos
- `password_reset_tokens` - Tokens de recuperacion
- `process_traces` - Trazabilidad de procesos
- `information_requests` - Solicitudes de informacion
- `document_access_logs` - Acceso a documentos

### Funciones SQL
- `create_password_reset_token()` - Genera tokens de recuperacion
- `create_template_version()` - Trigger para versionado automatico
- `create_user_profile()` - Crea perfil al registrar usuario
- `get_user_role()` - Obtiene rol del usuario (security definer)
- `handle_profile_updated()` - Trigger para actualizar timestamp
- `update_updated_at_column()` - Trigger generico para updated_at

## Secuencia de Implementacion

### Paso 1: Crear ENUMs y Extension
```text
CREATE TYPE public.user_role AS ENUM (...)
CREATE TYPE public.sale_status AS ENUM (...)
CREATE TYPE public.document_status AS ENUM (...)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
```

### Paso 2: Crear Tablas Base (sin FK)
Tablas independientes primero:
- companies, countries, template_placeholders

### Paso 3: Crear Tablas con Dependencias
En orden de dependencias:
1. profiles (depende de companies)
2. clients, plans, templates (dependen de companies)
3. sales (depende de clients, plans, profiles)
4. Resto de tablas...

### Paso 4: Crear Funciones y Triggers
- Funciones security definer para RLS
- Triggers de actualizacion automatica
- Trigger de versionado de templates

### Paso 5: Habilitar RLS y Crear Politicas
Politicas basadas en:
- company_id para aislamiento multi-tenant
- user_id para datos personales
- Rol para permisos administrativos

## Datos de Ejemplo
El backup incluye datos de prueba:
- 1 empresa de ejemplo
- Usuarios de prueba
- Clientes demo
- Templates predefinidos

## Compatibilidad con Codigo Existente

El codigo frontend ya tiene:
- Hooks para todas las entidades (useUsers, useSales, useClients, etc.)
- Componentes de formularios y listas
- Sistema de autenticacion con roles
- Dashboard con widgets configurables

**No se requieren cambios en el codigo** - esta disenado para este esquema.

## Advertencia de Seguridad

El esquema almacena el rol en la tabla `profiles`. Segun las mejores practicas, deberiamos considerar mover los roles a una tabla separada `user_roles` para evitar ataques de escalacion de privilegios. Esto requeriria cambios menores en el codigo.

## Proximos Pasos Despues de la Migracion

1. Crear usuario inicial (super_admin)
2. Crear empresa de prueba
3. Configurar storage buckets para documentos
4. Probar flujo completo de ventas y firmas
