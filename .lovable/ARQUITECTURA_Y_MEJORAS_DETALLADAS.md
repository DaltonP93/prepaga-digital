# Análisis y Mejoras - Sistema de Ventas Samap con Firma Digital

## 📋 Índice
1. [Análisis del Estado Actual](#1-análisis-del-estado-actual)
2. [Mejoras Propuestas para la Base de Datos](#2-mejoras-propuestas-para-la-base-de-datos)
3. [Flujo Completo de Firma Digital](#3-flujo-completo-de-firma-digital)
4. [Arquitectura de Perfiles y Roles](#4-arquitectura-de-perfiles-y-roles)
5. [Implementación Técnica Detallada](#5-implementación-técnica-detallada)
6. [Plan de Implementación](#6-plan-de-implementación)

---

## 1. Análisis del Estado Actual

### 1.1 Fortalezas Identificadas ✅
- Base de datos bien estructurada con relaciones claras
- Sistema de auditoría implementado (`audit_logs`, `audit_processes`)
- Multiempresa configurado (`companies`, `company_settings`)
- Sistema básico de firma digital presente
- Roles de usuario definidos

### 1.2 Gaps Críticos Identificados 🔴

#### Base de Datos
- **Falta tabla `document_types`**: No hay catálogo de tipos de documentos
- **Adherentes incompletos**: `beneficiaries` no tiene campos suficientes para documentación
- **Workflow de firma limitado**: No hay estados intermedios del proceso
- **Falta tabla de paquetes de documentos**: No se pueden agrupar documentos para envío
- **Sin trazabilidad de envíos**: No hay registro de cuándo/cómo se enviaron los documentos

#### Funcionalidad
- **Flujo de firma incompleto**: No hay gestión de múltiples documentos simultáneos
- **Sin gestión de adherentes**: No hay UI para cargar adherentes y sus documentos
- **Plantillas limitadas**: No hay versión dinámica de contratos según datos
- **Sin WhatsApp integrado**: Falta envío automático de enlaces
- **Auditoría incompleta**: No se registran todas las acciones del flujo

---

## 2. Mejoras Propuestas para la Base de Datos

### 2.1 Nuevas Tablas Requeridas

```sql
-- ================================================
-- TABLA: document_types
-- Catálogo de tipos de documentos del sistema
-- ================================================
CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar NOT NULL UNIQUE, -- 'contrato', 'ddjj_salud', 'anexo_a', etc.
  name varchar NOT NULL,
  description text,
  requires_signature boolean DEFAULT false,
  is_required boolean DEFAULT false, -- ¿Es obligatorio para completar venta?
  applies_to varchar DEFAULT 'titular', -- 'titular', 'adherente', 'ambos'
  template_id uuid REFERENCES public.templates(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: document_packages
-- Paquetes de documentos para envío conjunto
-- ================================================
CREATE TABLE public.document_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  package_type varchar DEFAULT 'firma_cliente', -- 'firma_cliente', 'documentacion_completa', etc.
  name varchar NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: document_package_items
-- Documentos incluidos en cada paquete
-- ================================================
CREATE TABLE public.document_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.document_packages(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id),
  is_required boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: signature_links
-- Enlaces únicos para firma digital
-- ================================================
CREATE TABLE public.signature_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  package_id uuid REFERENCES public.document_packages(id),
  token varchar NOT NULL UNIQUE, -- Token único para URL
  recipient_type varchar NOT NULL, -- 'titular', 'adherente'
  recipient_id uuid, -- Si es adherente, ID del beneficiario
  recipient_email varchar NOT NULL,
  recipient_phone varchar,
  expires_at timestamptz NOT NULL,
  accessed_at timestamptz, -- Primera vez que se abrió el enlace
  access_count integer DEFAULT 0,
  ip_addresses jsonb DEFAULT '[]'::jsonb, -- Array de IPs que accedieron
  status varchar DEFAULT 'pendiente', -- 'pendiente', 'visto', 'completado', 'expirado'
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: signature_workflow_steps
-- Estados del flujo de firma
-- ================================================
CREATE TABLE public.signature_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_link_id uuid NOT NULL REFERENCES public.signature_links(id),
  step_order integer NOT NULL,
  step_type varchar NOT NULL, -- 'view_document', 'sign_document', 'upload_file', 'fill_form'
  document_id uuid REFERENCES public.documents(id),
  status varchar DEFAULT 'pendiente', -- 'pendiente', 'en_progreso', 'completado', 'omitido'
  started_at timestamptz,
  completed_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb, -- Datos adicionales del paso
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: beneficiaries (MEJORAS)
-- Agregar campos necesarios para adherentes
-- ================================================
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS document_type varchar; -- 'CI', 'pasaporte', etc.
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS document_number varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS gender varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS marital_status varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS city varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS province varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS postal_code varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS occupation varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS has_preexisting_conditions boolean DEFAULT false;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS preexisting_conditions_detail text;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS signature_required boolean DEFAULT true;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS signature_link_id uuid REFERENCES public.signature_links(id);

-- ================================================
-- TABLA: beneficiary_documents
-- Documentos adjuntos de adherentes
-- ================================================
CREATE TABLE public.beneficiary_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id),
  document_type_id uuid REFERENCES public.document_types(id),
  file_name varchar NOT NULL,
  file_url text NOT NULL,
  file_type varchar,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id),
  upload_source varchar DEFAULT 'vendedor', -- 'vendedor', 'cliente', 'adherente'
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: whatsapp_messages
-- Registro de mensajes de WhatsApp enviados
-- ================================================
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  sale_id uuid REFERENCES public.sales(id),
  signature_link_id uuid REFERENCES public.signature_links(id),
  phone_number varchar NOT NULL,
  message_type varchar DEFAULT 'signature_link', -- 'signature_link', 'reminder', 'confirmation', etc.
  message_body text NOT NULL,
  whatsapp_message_id varchar, -- ID del mensaje en WhatsApp API
  status varchar DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  sent_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: sale_workflow_states
-- Estados del flujo de venta
-- ================================================
CREATE TABLE public.sale_workflow_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  previous_status varchar,
  new_status varchar NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  change_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- ÍNDICES PARA RENDIMIENTO
-- ================================================
CREATE INDEX idx_signature_links_token ON public.signature_links(token);
CREATE INDEX idx_signature_links_sale ON public.signature_links(sale_id);
CREATE INDEX idx_signature_links_status ON public.signature_links(status);
CREATE INDEX idx_documents_sale_type ON public.documents(sale_id, document_type);
CREATE INDEX idx_beneficiaries_sale ON public.beneficiaries(sale_id);
CREATE INDEX idx_whatsapp_messages_sale ON public.whatsapp_messages(sale_id);
CREATE INDEX idx_sale_workflow_states_sale ON public.sale_workflow_states(sale_id);
```

### 2.2 Modificaciones a Tablas Existentes

```sql
-- ================================================
-- SALES: Agregar campos para flujo de firma
-- ================================================
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS contract_number varchar UNIQUE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS request_number varchar;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS requires_adherents boolean DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS adherents_count integer DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS all_signatures_completed boolean DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS signature_completed_at timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS auditor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS audited_at timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS audit_status varchar DEFAULT 'pendiente'; -- 'pendiente', 'aprobado', 'rechazado'
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS audit_notes text;

-- ================================================
-- DOCUMENTS: Mejorar gestión de documentos
-- ================================================
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type_id uuid REFERENCES public.document_types(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS generated_from_template boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signed_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signature_data text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS beneficiary_id uuid REFERENCES public.beneficiaries(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false;

-- ================================================
-- TEMPLATES: Agregar capacidades de generación dinámica
-- ================================================
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS template_type varchar DEFAULT 'contrato'; -- 'contrato', 'ddjj_salud', 'anexo', etc.
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS uses_dynamic_fields boolean DEFAULT true;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS pdf_layout jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT true;
```

---

## 3. Flujo Completo de Firma Digital

### 3.1 Diagrama del Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                    INICIO: VENDEDOR                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: Crear Venta en Estado "Borrador"                      │
│  - Seleccionar cliente titular                                  │
│  - Seleccionar plan                                             │
│  - Ingresar monto                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: Agregar Adherentes (si aplica)                        │
│  - Datos personales completos                                   │
│  - Relación con titular                                         │
│  - Información de salud                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: Completar Declaración Jurada de Salud                 │
│  - OPCIÓN A: Vendedor completa por el cliente                  │
│  - OPCIÓN B: Cliente completa online                            │
│  - Para titular y cada adherente                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: Adjuntar Documentos                                   │
│  - CI/Cédula (titular y adherentes)                            │
│  - Comprobante de domicilio                                     │
│  - Otros documentos requeridos                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: Generar Documentos Finales                            │
│  - Contrato con datos del cliente                              │
│  - DDJJ de Salud compilada                                      │
│  - Anexos según plan                                            │
│  - Crear paquete de documentos                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: Seleccionar Documentos para Firma                     │
│  - Marcar documentos que requieren firma                        │
│  - Definir orden de presentación                                │
│  - Generar enlaces únicos                                       │
│    • Enlace para titular                                        │
│    • Enlaces para adherentes (si requieren firma)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 7: Enviar por WhatsApp                                   │
│  - Mensaje personalizado con enlace                             │
│  - Recordatorio de vigencia (24-48 hs)                         │
│  - Instrucciones claras                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE/ADHERENTE                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 8: Cliente Abre Enlace                                   │
│  - Validación de token                                          │
│  - Registro de acceso (IP, fecha/hora)                         │
│  - Verificar vigencia del enlace                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 9: Revisar Documentos                                    │
│  - Visualizar información personal                              │
│  - Ver plan contratado y precio                                 │
│  - Leer contrato completo                                       │
│  - Revisar DDJJ de Salud                                        │
│  - Ver anexos y condiciones                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 10: Firmar Digitalmente                                  │
│  - Canvas para firma a mano alzada                              │
│  - Opción de limpiar y re-firmar                                │
│  - Aceptación de términos y condiciones                         │
│  - Confirmación final                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 11: Procesamiento de Firma                               │
│  - Guardar firma en base de datos                               │
│  - Timestamp con fecha/hora exacta                              │
│  - Registro de IP del firmante                                  │
│  - Generar hash de verificación                                 │
│  - Cambiar estado del enlace a "completado"                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 12: Generación de PDF Firmado                            │
│  - Incrustar firma digital en documento                         │
│  - Agregar metadata de firma                                    │
│  - Sello de tiempo                                              │
│  - QR de verificación (opcional)                                │
│  - Guardar en storage                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 13: Notificaciones                                       │
│  - Enviar confirmación al cliente (WhatsApp/Email)              │
│  - Notificar al vendedor                                        │
│  - Actualizar dashboard del vendedor                            │
│  - Si todos firmaron → Estado "Firmado"                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DE VUELTA AL VENDEDOR                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 14: Verificación por Vendedor                            │
│  - Ver todas las firmas recibidas                              │
│  - Descargar PDFs firmados                                      │
│  - Verificar documentos adjuntos                                │
│  - Cambiar estado a "En Auditoría"                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AUDITOR                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 15: Auditoría                                            │
│  - Revisar documentación completa                               │
│  - Verificar firmas                                             │
│  - Validar información                                          │
│  - APROBAR o RECHAZAR                                           │
│  - Dejar notas/observaciones                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
                APROBADO           RECHAZADO
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ Estado:          │  │ Volver a         │
         │ "Completado"     │  │ Vendedor para    │
         │                  │  │ correcciones     │
         └──────────────────┘  └──────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  VENTA FINALIZADA    │
         │  - Archivar docs     │
         │  - Activar póliza    │
         │  - Notificar cliente │
         └──────────────────────┘
```

### 3.2 Estados de la Venta

```javascript
const saleStatuses = {
  'borrador': {
    label: 'Borrador',
    color: 'gray',
    canEdit: true,
    nextStates: ['preparando_documentos'],
    requiredActions: ['Completar datos básicos']
  },
  'preparando_documentos': {
    label: 'Preparando Documentos',
    color: 'blue',
    canEdit: true,
    nextStates: ['listo_para_enviar'],
    requiredActions: [
      'Agregar adherentes (si aplica)',
      'Completar DDJJ de Salud',
      'Adjuntar documentos',
      'Generar contratos'
    ]
  },
  'listo_para_enviar': {
    label: 'Listo para Enviar',
    color: 'yellow',
    canEdit: true,
    nextStates: ['enviado'],
    requiredActions: ['Seleccionar documentos', 'Enviar enlace de firma']
  },
  'enviado': {
    label: 'Enviado para Firma',
    color: 'orange',
    canEdit: false,
    nextStates: ['firmado_parcial', 'firmado', 'expirado'],
    requiredActions: ['Esperar firma del cliente']
  },
  'firmado_parcial': {
    label: 'Firmado Parcialmente',
    color: 'purple',
    canEdit: false,
    nextStates: ['firmado'],
    requiredActions: ['Esperar firmas faltantes']
  },
  'firmado': {
    label: 'Firmado Completo',
    color: 'green',
    canEdit: false,
    nextStates: ['en_auditoria'],
    requiredActions: ['Enviar a auditoría']
  },
  'en_auditoria': {
    label: 'En Auditoría',
    color: 'indigo',
    canEdit: false,
    nextStates: ['completado', 'rechazado'],
    requiredActions: ['Esperar aprobación del auditor']
  },
  'completado': {
    label: 'Completado',
    color: 'emerald',
    canEdit: false,
    nextStates: [],
    requiredActions: []
  },
  'rechazado': {
    label: 'Rechazado',
    color: 'red',
    canEdit: true,
    nextStates: ['preparando_documentos'],
    requiredActions: ['Corregir observaciones']
  },
  'expirado': {
    label: 'Enlace Expirado',
    color: 'gray',
    canEdit: true,
    nextStates: ['listo_para_enviar'],
    requiredActions: ['Generar nuevo enlace']
  },
  'cancelado': {
    label: 'Cancelado',
    color: 'slate',
    canEdit: false,
    nextStates: [],
    requiredActions: []
  }
};
```

---

## 4. Arquitectura de Perfiles y Roles

### 4.1 Definición de Roles con Permisos Detallados

```typescript
// types/roles.ts
export type AppRole = 'super_admin' | 'admin' | 'supervisor' | 'auditor' | 'vendedor';

export interface RolePermissions {
  // Gestión de Empresas
  companies: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    switch: boolean; // Cambiar entre empresas
  };
  
  // Gestión de Usuarios
  users: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    assignRoles: boolean;
    viewAll: boolean; // Ver usuarios de toda la empresa vs solo propios
  };
  
  // Gestión de Planes
  plans: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    updatePricing: boolean; // Permiso especial para cambiar precios
  };
  
  // Gestión de Templates
  templates: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    design: boolean; // Diseñar estructura de templates
    publish: boolean; // Publicar/activar templates
  };
  
  // Gestión de Clientes
  clients: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    viewAll: boolean; // Ver todos vs solo propios
    export: boolean;
  };
  
  // Gestión de Ventas
  sales: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    viewAll: boolean;
    changeStatus: boolean;
    sendSignature: boolean; // Enviar para firma
    resendSignature: boolean; // Reenviar enlaces
    viewSignatures: boolean; // Ver firmas recibidas
  };
  
  // Gestión de Documentos
  documents: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    upload: boolean;
    download: boolean;
    generate: boolean; // Generar desde templates
    sign: boolean; // Firmar documentos
  };
  
  // Auditoría
  audit: {
    access: boolean;
    approve: boolean;
    reject: boolean;
    viewAll: boolean;
    assignAuditor: boolean;
  };
  
  // Comunicaciones
  communications: {
    sendWhatsApp: boolean;
    sendEmail: boolean;
    sendSMS: boolean;
    viewHistory: boolean;
    createCampaigns: boolean;
  };
  
  // Configuración
  settings: {
    company: boolean; // Configuración de empresa
    integrations: boolean; // APIs, WhatsApp, etc.
    billing: boolean;
    currencies: boolean;
    ui: boolean; // Personalización de UI
  };
  
  // Reportes y Analytics
  analytics: {
    viewDashboard: boolean;
    viewReports: boolean;
    exportReports: boolean;
    viewAllMetrics: boolean; // Métricas de toda la empresa vs propias
  };
}

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  super_admin: {
    // SUPER ADMIN: Control total del sistema
    companies: {
      create: true,
      read: true,
      update: true,
      delete: true,
      switch: true,
    },
    users: {
      create: true,
      read: true,
      update: true,
      delete: true,
      assignRoles: true,
      viewAll: true,
    },
    plans: {
      create: true,
      read: true,
      update: true,
      delete: true,
      updatePricing: true,
    },
    templates: {
      create: true,
      read: true,
      update: true,
      delete: true,
      design: true,
      publish: true,
    },
    clients: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: true,
      export: true,
    },
    sales: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: true,
      changeStatus: true,
      sendSignature: true,
      resendSignature: true,
      viewSignatures: true,
    },
    documents: {
      create: true,
      read: true,
      update: true,
      delete: true,
      upload: true,
      download: true,
      generate: true,
      sign: true,
    },
    audit: {
      access: true,
      approve: true,
      reject: true,
      viewAll: true,
      assignAuditor: true,
    },
    communications: {
      sendWhatsApp: true,
      sendEmail: true,
      sendSMS: true,
      viewHistory: true,
      createCampaigns: true,
    },
    settings: {
      company: true,
      integrations: true,
      billing: true,
      currencies: true,
      ui: true,
    },
    analytics: {
      viewDashboard: true,
      viewReports: true,
      exportReports: true,
      viewAllMetrics: true,
    },
  },
  
  admin: {
    // ADMIN: Control de su empresa
    companies: {
      create: false,
      read: true,
      update: true, // Solo su empresa
      delete: false,
      switch: false,
    },
    users: {
      create: true,
      read: true,
      update: true,
      delete: true,
      assignRoles: true, // Puede asignar roles excepto super_admin
      viewAll: true,
    },
    plans: {
      create: true,
      read: true,
      update: true,
      delete: true,
      updatePricing: true,
    },
    templates: {
      create: true,
      read: true,
      update: true,
      delete: true,
      design: true,
      publish: true,
    },
    clients: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: true,
      export: true,
    },
    sales: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: true,
      changeStatus: true,
      sendSignature: true,
      resendSignature: true,
      viewSignatures: true,
    },
    documents: {
      create: true,
      read: true,
      update: true,
      delete: true,
      upload: true,
      download: true,
      generate: true,
      sign: true,
    },
    audit: {
      access: true,
      approve: true,
      reject: true,
      viewAll: true,
      assignAuditor: true,
    },
    communications: {
      sendWhatsApp: true,
      sendEmail: true,
      sendSMS: true,
      viewHistory: true,
      createCampaigns: true,
    },
    settings: {
      company: true,
      integrations: true,
      billing: true,
      currencies: true,
      ui: true,
    },
    analytics: {
      viewDashboard: true,
      viewReports: true,
      exportReports: true,
      viewAllMetrics: true,
    },
  },
  
  supervisor: {
    // SUPERVISOR: Gestión de planes, templates y oversight
    companies: {
      create: false,
      read: true,
      update: false,
      delete: false,
      switch: false,
    },
    users: {
      create: false,
      read: true,
      update: false,
      delete: false,
      assignRoles: false,
      viewAll: true,
    },
    plans: {
      create: true,
      read: true,
      update: true,
      delete: false,
      updatePricing: true, // Puede actualizar precios si está habilitado
    },
    templates: {
      create: true,
      read: true,
      update: true,
      delete: false,
      design: true, // Puede diseñar templates
      publish: true,
    },
    clients: {
      create: false,
      read: true,
      update: false,
      delete: false,
      viewAll: true,
      export: true,
    },
    sales: {
      create: false,
      read: true,
      update: false,
      delete: false,
      viewAll: true,
      changeStatus: false,
      sendSignature: false,
      resendSignature: false,
      viewSignatures: true,
    },
    documents: {
      create: false,
      read: true,
      update: false,
      delete: false,
      upload: false,
      download: true,
      generate: true, // Puede generar templates
      sign: false,
    },
    audit: {
      access: false,
      approve: false,
      reject: false,
      viewAll: false,
      assignAuditor: false,
    },
    communications: {
      sendWhatsApp: false,
      sendEmail: false,
      sendSMS: false,
      viewHistory: true,
      createCampaigns: false,
    },
    settings: {
      company: false,
      integrations: false,
      billing: false,
      currencies: false,
      ui: false,
    },
    analytics: {
      viewDashboard: true,
      viewReports: true,
      exportReports: true,
      viewAllMetrics: true,
    },
  },
  
  auditor: {
    // AUDITOR: Revisar y aprobar ventas
    companies: {
      create: false,
      read: true,
      update: false,
      delete: false,
      switch: false,
    },
    users: {
      create: false,
      read: true,
      update: false,
      delete: false,
      assignRoles: false,
      viewAll: false,
    },
    plans: {
      create: false,
      read: true,
      update: false,
      delete: false,
      updatePricing: false,
    },
    templates: {
      create: false,
      read: true,
      update: false,
      delete: false,
      design: false,
      publish: false,
    },
    clients: {
      create: false,
      read: true,
      update: false,
      delete: false,
      viewAll: true,
      export: false,
    },
    sales: {
      create: false,
      read: true,
      update: false,
      delete: false,
      viewAll: true, // Solo ventas asignadas o en auditoría
      changeStatus: false,
      sendSignature: false,
      resendSignature: false,
      viewSignatures: true,
    },
    documents: {
      create: false,
      read: true,
      update: false,
      delete: false,
      upload: false,
      download: true,
      generate: false,
      sign: false,
    },
    audit: {
      access: true,
      approve: true,
      reject: true,
      viewAll: true, // Solo ventas en auditoría
      assignAuditor: false,
    },
    communications: {
      sendWhatsApp: false,
      sendEmail: false,
      sendSMS: false,
      viewHistory: true,
      createCampaigns: false,
    },
    settings: {
      company: false,
      integrations: false,
      billing: false,
      currencies: false,
      ui: false,
    },
    analytics: {
      viewDashboard: true,
      viewReports: true,
      exportReports: false,
      viewAllMetrics: false,
    },
  },
  
  vendedor: {
    // VENDEDOR: Crear y gestionar ventas
    companies: {
      create: false,
      read: true,
      update: false,
      delete: false,
      switch: false,
    },
    users: {
      create: false,
      read: false,
      update: false,
      delete: false,
      assignRoles: false,
      viewAll: false,
    },
    plans: {
      create: false,
      read: true,
      update: false,
      delete: false,
      updatePricing: false,
    },
    templates: {
      create: false,
      read: true,
      update: false,
      delete: false,
      design: false,
      publish: false,
    },
    clients: {
      create: true,
      read: true,
      update: true,
      delete: false,
      viewAll: false, // Solo sus clientes
      export: false,
    },
    sales: {
      create: true,
      read: true,
      update: true,
      delete: false,
      viewAll: false, // Solo sus ventas
      changeStatus: true, // Puede cambiar estados permitidos
      sendSignature: true,
      resendSignature: true,
      viewSignatures: true,
    },
    documents: {
      create: true,
      read: true,
      update: true,
      delete: false,
      upload: true,
      download: true,
      generate: true,
      sign: false,
    },
    audit: {
      access: false,
      approve: false,
      reject: false,
      viewAll: false,
      assignAuditor: false,
    },
    communications: {
      sendWhatsApp: true,
      sendEmail: true,
      sendSMS: false,
      viewHistory: true,
      createCampaigns: false,
    },
    settings: {
      company: false,
      integrations: false,
      billing: false,
      currencies: false,
      ui: true, // Solo su UI personal
    },
    analytics: {
      viewDashboard: true,
      viewReports: false,
      exportReports: false,
      viewAllMetrics: false, // Solo sus métricas
    },
  },
};
```

### 4.2 Hook para Verificación de Permisos

```typescript
// hooks/usePermissions.ts
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { ROLE_PERMISSIONS, type AppRole } from '@/types/roles';

export const usePermissions = () => {
  const { profile } = useSimpleAuthContext();
  const userRole = (profile?.role as AppRole) || 'vendedor';
  const permissions = ROLE_PERMISSIONS[userRole];

  const can = (
    resource: keyof typeof ROLE_PERMISSIONS.super_admin,
    action: string
  ): boolean => {
    const resourcePermissions = permissions[resource] as any;
    return resourcePermissions?.[action] === true;
  };

  const canAny = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.some(({ resource, action }) => 
      can(resource as any, action)
    );
  };

  const canAll = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.every(({ resource, action }) => 
      can(resource as any, action)
    );
  };

  return {
    permissions,
    can,
    canAny,
    canAll,
    role: userRole,
  };
};
```

---

## 5. Implementación Técnica Detallada

### 5.1 Componente de Gestión de Adherentes

```typescript
// components/BeneficiaryManager.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Beneficiary {
  id?: string;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: string;
  relationship: string;
  email: string;
  phone: string;
  gender: string;
  marital_status: string;
  address: string;
  city: string;
  province: string;
  occupation: string;
  has_preexisting_conditions: boolean;
  preexisting_conditions_detail: string;
  signature_required: boolean;
  documents: File[];
}

interface BeneficiaryManagerProps {
  saleId: string;
  onBeneficiariesChange: (beneficiaries: Beneficiary[]) => void;
  initialBeneficiaries?: Beneficiary[];
}

export const BeneficiaryManager: React.FC<BeneficiaryManagerProps> = ({
  saleId,
  onBeneficiariesChange,
  initialBeneficiaries = [],
}) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);

  const addBeneficiary = () => {
    const newBeneficiary: Beneficiary = {
      first_name: '',
      last_name: '',
      dni: '',
      birth_date: '',
      relationship: '',
      email: '',
      phone: '',
      gender: '',
      marital_status: '',
      address: '',
      city: '',
      province: '',
      occupation: '',
      has_preexisting_conditions: false,
      preexisting_conditions_detail: '',
      signature_required: true,
      documents: [],
    };
    
    const updated = [...beneficiaries, newBeneficiary];
    setBeneficiaries(updated);
    onBeneficiariesChange(updated);
  };

  const removeBeneficiary = (index: number) => {
    const updated = beneficiaries.filter((_, i) => i !== index);
    setBeneficiaries(updated);
    onBeneficiariesChange(updated);
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: any) => {
    const updated = [...beneficiaries];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiaries(updated);
    onBeneficiariesChange(updated);
  };

  const handleFileUpload = (index: number, files: FileList | null) => {
    if (!files) return;
    
    const updated = [...beneficiaries];
    updated[index].documents = [...updated[index].documents, ...Array.from(files)];
    setBeneficiaries(updated);
    onBeneficiariesChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Adherentes / Grupo Familiar</h3>
        <Button onClick={addBeneficiary} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Adherente
        </Button>
      </div>

      {beneficiaries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No hay adherentes agregados. Haga clic en "Agregar Adherente" para comenzar.
          </CardContent>
        </Card>
      ) : (
        beneficiaries.map((beneficiary, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">
                  Adherente {index + 1}
                  {beneficiary.first_name && beneficiary.last_name && 
                    `: ${beneficiary.first_name} ${beneficiary.last_name}`
                  }
                </CardTitle>
                <Button
                  onClick={() => removeBeneficiary(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={beneficiary.first_name}
                    onChange={(e) => updateBeneficiary(index, 'first_name', e.target.value)}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label>Apellido *</Label>
                  <Input
                    value={beneficiary.last_name}
                    onChange={(e) => updateBeneficiary(index, 'last_name', e.target.value)}
                    placeholder="Apellido"
                  />
                </div>
                <div>
                  <Label>CI/DNI *</Label>
                  <Input
                    value={beneficiary.dni}
                    onChange={(e) => updateBeneficiary(index, 'dni', e.target.value)}
                    placeholder="Número de documento"
                  />
                </div>
                <div>
                  <Label>Fecha de Nacimiento *</Label>
                  <Input
                    type="date"
                    value={beneficiary.birth_date}
                    onChange={(e) => updateBeneficiary(index, 'birth_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Relación con Titular *</Label>
                  <Select
                    value={beneficiary.relationship}
                    onValueChange={(value) => updateBeneficiary(index, 'relationship', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conyuge">Cónyuge</SelectItem>
                      <SelectItem value="hijo">Hijo/a</SelectItem>
                      <SelectItem value="padre">Padre/Madre</SelectItem>
                      <SelectItem value="hermano">Hermano/a</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Género</Label>
                  <Select
                    value={beneficiary.gender}
                    onValueChange={(value) => updateBeneficiary(index, 'gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={beneficiary.email}
                    onChange={(e) => updateBeneficiary(index, 'email', e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={beneficiary.phone}
                    onChange={(e) => updateBeneficiary(index, 'phone', e.target.value)}
                    placeholder="+595 XXX XXX XXX"
                  />
                </div>
              </div>

              {/* Información de Salud */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`preexisting-${index}`}
                    checked={beneficiary.has_preexisting_conditions}
                    onCheckedChange={(checked) => 
                      updateBeneficiary(index, 'has_preexisting_conditions', checked)
                    }
                  />
                  <Label htmlFor={`preexisting-${index}`} className="cursor-pointer">
                    ¿Tiene condiciones preexistentes?
                  </Label>
                </div>
                
                {beneficiary.has_preexisting_conditions && (
                  <div>
                    <Label>Detalle de Condiciones Preexistentes</Label>
                    <Textarea
                      value={beneficiary.preexisting_conditions_detail}
                      onChange={(e) => 
                        updateBeneficiary(index, 'preexisting_conditions_detail', e.target.value)
                      }
                      placeholder="Describa las condiciones preexistentes..."
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* Documentos */}
              <div className="space-y-3">
                <Label>Documentos Adjuntos</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(index, e.target.files)}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </Button>
                </div>
                
                {beneficiary.documents.length > 0 && (
                  <div className="space-y-1">
                    {beneficiary.documents.map((doc, docIndex) => (
                      <div key={docIndex} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{doc.name}</span>
                        <span className="text-muted-foreground">
                          ({(doc.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Firma Requerida */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`signature-${index}`}
                  checked={beneficiary.signature_required}
                  onCheckedChange={(checked) => 
                    updateBeneficiary(index, 'signature_required', checked)
                  }
                />
                <Label htmlFor={`signature-${index}`} className="cursor-pointer">
                  Requiere firma digital del adherente
                </Label>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
```

### 5.2 Componente de Selector de Documentos para Firma

```typescript
// components/DocumentPackageSelector.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  document_type: string;
  requires_signature: boolean;
  file_url: string;
  status: string;
}

interface DocumentPackageSelectorProps {
  saleId: string;
  onSendPackage: (selectedDocIds: string[]) => Promise<void>;
}

export const DocumentPackageSelector: React.FC<DocumentPackageSelectorProps> = ({
  saleId,
  onSendPackage,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [saleId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      
      // Auto-seleccionar documentos que requieren firma
      const autoSelect = new Set(
        data?.filter(d => d.requires_signature).map(d => d.id) || []
      );
      setSelectedDocs(autoSelect);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleSend = async () => {
    if (selectedDocs.size === 0) {
      toast.error('Debe seleccionar al menos un documento');
      return;
    }

    setSending(true);
    try {
      await onSendPackage(Array.from(selectedDocs));
      toast.success('Documentos enviados exitosamente');
    } catch (error) {
      console.error('Error sending package:', error);
      toast.error('Error al enviar documentos');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div>Cargando documentos...</div>;
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No hay documentos disponibles para enviar.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Genere los documentos primero antes de enviar para firma.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasSignatureRequired = documents.some(d => d.requires_signature);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Documentos para Enviar</CardTitle>
          <CardDescription>
            Marque los documentos que desea incluir en el paquete de firma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={`doc-${doc.id}`}
                checked={selectedDocs.has(doc.id)}
                onCheckedChange={() => toggleDocument(doc.id)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={`doc-${doc.id}`}
                  className="flex items-center gap-2 cursor-pointer font-normal"
                >
                  <FileText className="h-4 w-4" />
                  <span>{doc.name}</span>
                  {doc.requires_signature && (
                    <Badge variant="secondary" className="text-xs">
                      Requiere Firma
                    </Badge>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground ml-6">
                  Tipo: {doc.document_type}
                </p>
              </div>
              <Badge variant={doc.status === 'pendiente' ? 'outline' : 'default'}>
                {doc.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Documentos seleccionados:</span>
              <span>{selectedDocs.size} de {documents.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Con firma requerida:</span>
              <span>
                {documents.filter(d => selectedDocs.has(d.id) && d.requires_signature).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón de Envío */}
      <Button
        onClick={handleSend}
        disabled={selectedDocs.size === 0 || sending}
        className="w-full"
        size="lg"
      >
        {sending ? (
          <>Enviando...</>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Enviar Paquete de Firma por WhatsApp
          </>
        )}
      </Button>

      {!hasSignatureRequired && (
        <p className="text-sm text-amber-600 text-center">
          ⚠️ Ningún documento requiere firma. Asegúrese de que sea correcto.
        </p>
      )}
    </div>
  );
};
```

### 5.3 Servicio de Generación de Enlaces de Firma

```typescript
// services/signatureService.ts
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { addHours } from 'date-fns';

interface CreateSignatureLinkParams {
  saleId: string;
  packageId: string;
  recipientType: 'titular' | 'adherente';
  recipientId?: string; // ID del beneficiario si es adherente
  recipientEmail: string;
  recipientPhone: string;
  expirationHours?: number;
  createdBy: string;
}

interface SignatureLinkResult {
  success: boolean;
  linkId?: string;
  token?: string;
  fullUrl?: string;
  error?: string;
}

export class SignatureService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_APP_URL || 'https://prepaga-digital.lovable.app';
  }

  /**
   * Crea un enlace único de firma digital
   */
  async createSignatureLink(
    params: CreateSignatureLinkParams
  ): Promise<SignatureLinkResult> {
    try {
      const token = nanoid(32); // Token seguro de 32 caracteres
      const expiresAt = addHours(new Date(), params.expirationHours || 48);

      const { data, error } = await supabase
        .from('signature_links')
        .insert({
          sale_id: params.saleId,
          package_id: params.packageId,
          token,
          recipient_type: params.recipientType,
          recipient_id: params.recipientId,
          recipient_email: params.recipientEmail,
          recipient_phone: params.recipientPhone,
          expires_at: expiresAt.toISOString(),
          status: 'pendiente',
          created_by: params.createdBy,
        })
        .select()
        .single();

      if (error) throw error;

      const fullUrl = `${this.baseUrl}/firma/${token}`;

      return {
        success: true,
        linkId: data.id,
        token,
        fullUrl,
      };
    } catch (error) {
      console.error('Error creating signature link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Crea enlaces para titular y todos los adherentes
   */
  async createAllSignatureLinks(
    saleId: string,
    packageId: string,
    createdBy: string
  ): Promise<{
    success: boolean;
    links: Array<{
      type: string;
      name: string;
      url: string;
      phone: string;
    }>;
    error?: string;
  }> {
    try {
      // Obtener datos de la venta
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          clients (*),
          beneficiaries (*)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      const links = [];

      // Crear enlace para titular
      if (sale.clients) {
        const titularLink = await this.createSignatureLink({
          saleId,
          packageId,
          recipientType: 'titular',
          recipientEmail: sale.clients.email,
          recipientPhone: sale.clients.phone,
          createdBy,
        });

        if (titularLink.success) {
          links.push({
            type: 'titular',
            name: `${sale.clients.first_name} ${sale.clients.last_name}`,
            url: titularLink.fullUrl!,
            phone: sale.clients.phone,
          });
        }
      }

      // Crear enlaces para adherentes que requieren firma
      if (sale.beneficiaries && sale.beneficiaries.length > 0) {
        for (const beneficiary of sale.beneficiaries) {
          if (beneficiary.signature_required && beneficiary.email && beneficiary.phone) {
            const beneficiaryLink = await this.createSignatureLink({
              saleId,
              packageId,
              recipientType: 'adherente',
              recipientId: beneficiary.id,
              recipientEmail: beneficiary.email,
              recipientPhone: beneficiary.phone,
              createdBy,
            });

            if (beneficiaryLink.success) {
              links.push({
                type: 'adherente',
                name: `${beneficiary.first_name} ${beneficiary.last_name}`,
                url: beneficiaryLink.fullUrl!,
                phone: beneficiary.phone,
              });
            }
          }
        }
      }

      return {
        success: true,
        links,
      };
    } catch (error) {
      console.error('Error creating all signature links:', error);
      return {
        success: false,
        links: [],
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Valida un token de firma
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    linkData?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('signature_links')
        .select(`
          *,
          sales (
            *,
            clients (*),
            plans (*),
            beneficiaries (*)
          ),
          document_packages (
            *,
            document_package_items (
              documents (*)
            )
          )
        `)
        .eq('token', token)
        .single();

      if (error) throw error;

      // Verificar expiración
      const expiresAt = new Date(data.expires_at);
      const now = new Date();

      if (now > expiresAt) {
        // Actualizar estado a expirado
        await supabase
          .from('signature_links')
          .update({ status: 'expirado' })
          .eq('id', data.id);

        return {
          valid: false,
          error: 'El enlace ha expirado',
        };
      }

      // Registrar acceso
      await this.registerAccess(data.id);

      return {
        valid: true,
        linkData: data,
      };
    } catch (error) {
      console.error('Error validating token:', error);
      return {
        valid: false,
        error: 'Token inválido',
      };
    }
  }

  /**
   * Registra un acceso al enlace
   */
  private async registerAccess(linkId: string): Promise<void> {
    try {
      const { data: currentData } = await supabase
        .from('signature_links')
        .select('access_count, ip_addresses, accessed_at')
        .eq('id', linkId)
        .single();

      const updateData: any = {
        access_count: (currentData?.access_count || 0) + 1,
      };

      // Primera vez que se accede
      if (!currentData?.accessed_at) {
        updateData.accessed_at = new Date().toISOString();
        updateData.status = 'visto';
      }

      await supabase
        .from('signature_links')
        .update(updateData)
        .eq('id', linkId);
    } catch (error) {
      console.error('Error registering access:', error);
    }
  }

  /**
   * Procesa una firma completada
   */
  async processSignature(
    linkId: string,
    signatureData: string,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Guardar firma
      const { error: signatureError } = await supabase
        .from('signatures')
        .insert({
          sale_id: linkId, // Esto debería ser el sale_id real
          document_id: documentId,
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
        });

      if (signatureError) throw signatureError;

      // Actualizar estado del enlace
      await supabase
        .from('signature_links')
        .update({
          status: 'completado',
          completed_at: new Date().toISOString(),
        })
        .eq('id', linkId);

      // Actualizar documento
      await supabase
        .from('documents')
        .update({
          status: 'firmado',
          signed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return { success: true };
    } catch (error) {
      console.error('Error processing signature:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export const signatureService = new SignatureService();
```

### 5.4 Servicio de WhatsApp

```typescript
// services/whatsappService.ts
import { supabase } from '@/lib/supabase';

interface WhatsAppMessageParams {
  companyId: string;
  saleId: string;
  signatureLinkId?: string;
  phoneNumber: string;
  messageType: 'signature_link' | 'reminder' | 'confirmation';
  customMessage?: string;
  sentBy: string;
}

export class WhatsAppService {
  /**
   * Envía un mensaje de WhatsApp
   */
  async sendMessage(params: WhatsAppMessageParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Obtener configuración de la empresa
      const { data: settings } = await supabase
        .from('company_settings')
        .select('whatsapp_api_key, whatsapp_phone_id')
        .eq('company_id', params.companyId)
        .single();

      if (!settings?.whatsapp_api_key || !settings?.whatsapp_phone_id) {
        throw new Error('WhatsApp no está configurado para esta empresa');
      }

      // Generar mensaje según el tipo
      const messageBody = params.customMessage || 
        await this.generateMessage(params.messageType, params);

      // Registrar en base de datos
      const { data: messageRecord, error: dbError } = await supabase
        .from('whatsapp_messages')
        .insert({
          company_id: params.companyId,
          sale_id: params.saleId,
          signature_link_id: params.signatureLinkId,
          phone_number: params.phoneNumber,
          message_type: params.messageType,
          message_body: messageBody,
          status: 'pending',
          sent_by: params.sentBy,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Enviar a WhatsApp API (implementar según el proveedor)
      // Ejemplo con Meta WhatsApp Business API
      const whatsappResult = await this.sendToWhatsAppAPI({
        apiKey: settings.whatsapp_api_key,
        phoneId: settings.whatsapp_phone_id,
        to: params.phoneNumber,
        message: messageBody,
      });

      // Actualizar estado en base de datos
      await supabase
        .from('whatsapp_messages')
        .update({
          whatsapp_message_id: whatsappResult.messageId,
          status: whatsappResult.success ? 'sent' : 'failed',
          sent_at: whatsappResult.success ? new Date().toISOString() : null,
          error_message: whatsappResult.error,
        })
        .eq('id', messageRecord.id);

      return {
        success: whatsappResult.success,
        messageId: messageRecord.id,
        error: whatsappResult.error,
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Genera el contenido del mensaje según el tipo
   */
  private async generateMessage(
    type: string,
    params: WhatsAppMessageParams
  ): Promise<string> {
    switch (type) {
      case 'signature_link':
        return `
🏥 *SAMAP - Seguro Médico*

Hola! 👋

Hemos preparado sus documentos para firma digital.

🔗 Acceda al siguiente enlace para revisar y firmar:
[ENLACE_AQUÍ]

⏰ Este enlace es válido por 48 horas.

📝 Podrá:
• Ver su contrato
• Revisar su plan
• Firmar digitalmente
• Descargar documentos

¿Tiene dudas? Responda este mensaje.

Saludos,
Equipo SAMAP
        `.trim();

      case 'reminder':
        return `
🏥 *SAMAP - Recordatorio*

Hola! 👋

Le recordamos que aún tiene pendiente la firma de sus documentos.

🔗 Enlace de firma:
[ENLACE_AQUÍ]

⏰ El enlace vence pronto.

¿Necesita ayuda? Estamos aquí para asistirle.

Saludos,
Equipo SAMAP
        `.trim();

      case 'confirmation':
        return `
🏥 *SAMAP - Confirmación*

¡Gracias! ✅

Su firma ha sido recibida exitosamente.

📄 Sus documentos han sido procesados y pronto recibirá su póliza.

¿Tiene preguntas? Estamos a su disposición.

Saludos,
Equipo SAMAP
        `.trim();

      default:
        return '';
    }
  }

  /**
   * Envía mensaje a WhatsApp API
   * Implementar según el proveedor (Meta, Twilio, etc.)
   */
  private async sendToWhatsAppAPI(params: {
    apiKey: string;
    phoneId: string;
    to: string;
    message: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // IMPLEMENTAR LLAMADA A API DE WHATSAPP
      // Ejemplo con Meta WhatsApp Business API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${params.phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: params.to,
            type: 'text',
            text: {
              body: params.message,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.messages[0].id,
      };
    } catch (error) {
      console.error('WhatsApp API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de API',
      };
    }
  }

  /**
   * Envía recordatorios automáticos para enlaces próximos a vencer
   */
  async sendReminders(): Promise<void> {
    try {
      // Buscar enlaces que expiran en las próximas 6 horas
      const sixHoursFromNow = new Date();
      sixHoursFromNow.setHours(sixHoursFromNow.getHours() + 6);

      const { data: expiringLinks } = await supabase
        .from('signature_links')
        .select(`
          *,
          sales (
            company_id,
            clients (*)
          )
        `)
        .eq('status', 'visto')
        .lt('expires_at', sixHoursFromNow.toISOString())
        .is('completed_at', null);

      if (!expiringLinks || expiringLinks.length === 0) return;

      for (const link of expiringLinks) {
        await this.sendMessage({
          companyId: link.sales.company_id,
          saleId: link.sale_id,
          signatureLinkId: link.id,
          phoneNumber: link.recipient_phone,
          messageType: 'reminder',
          sentBy: 'system',
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }
}

export const whatsappService = new WhatsAppService();
```

---

## 6. Plan de Implementación

### 6.1 Fase 1: Base de Datos y Backend (1-2 semanas)

**Semana 1:**
- [ ] Ejecutar migraciones de base de datos
  - Crear nuevas tablas
  - Modificar tablas existentes
  - Crear índices
- [ ] Crear funciones de Supabase
  - `generate_contract_number()`
  - `check_all_signatures_completed(sale_id)`
  - `auto_advance_sale_status(sale_id)`
- [ ] Implementar Row Level Security (RLS)
  - Políticas por rol
  - Políticas de acceso público para firma

**Semana 2:**
- [ ] Crear Edge Functions
  - `generate-signature-link`
  - `send-whatsapp-message`
  - `process-signature`
  - `generate-signed-pdf`
- [ ] Configurar Storage Buckets
  - `documents` (privado)
  - `signatures` (privado)
  - `signed-contracts` (privado)
- [ ] Testing de backend

### 6.2 Fase 2: Componentes Core (2 semanas)

**Semana 3:**
- [ ] Implementar sistema de permisos
  - Hook `usePermissions`
  - Componente `ProtectedRoute`
  - Componente `PermissionGate`
- [ ] Componente BeneficiaryManager
- [ ] Componente DocumentPackageSelector
- [ ] Testing de componentes

**Semana 4:**
- [ ] Página de workflow de firma mejorada
- [ ] Vista pública de firma
- [ ] Componente SignatureCanvas mejorado
- [ ] Sistema de estados visuales

### 6.3 Fase 3: Integración WhatsApp (1 semana)

**Semana 5:**
- [ ] Configurar API de WhatsApp
- [ ] Implementar WhatsAppService
- [ ] Crear templates de mensajes
- [ ] Sistema de recordatorios automáticos
- [ ] Testing de envíos

### 6.4 Fase 4: Auditoría y Roles (1 semana)

**Semana 6:**
- [ ] Dashboard de auditor
- [ ] Sistema de aprobación/rechazo
- [ ] Notas y comentarios
- [ ] Filtros y búsqueda avanzada
- [ ] Testing de roles

### 6.5 Fase 5: Templates Dinámicos (1-2 semanas)

**Semana 7:**
- [ ] Editor de templates mejorado
- [ ] Sistema de placeholders
- [ ] Generación dinámica de PDFs
- [ ] Vista previa de documentos
- [ ] Testing de generación

**Semana 8 (opcional):**
- [ ] Templates de DDJJ de Salud
- [ ] Templates de anexos
- [ ] Versiones de templates
- [ ] Histórico de cambios

### 6.6 Fase 6: Testing y Refinamiento (1 semana)

**Semana 9:**
- [ ] Testing end-to-end completo
- [ ] Testing de rendimiento
- [ ] Corrección de bugs
- [ ] Optimizaciones
- [ ] Documentación

### 6.7 Fase 7: Deployment (1 semana)

**Semana 10:**
- [ ] Preparar ambiente de producción
- [ ] Migración de datos (si aplica)
- [ ] Configuración de dominios
- [ ] Configuración SSL
- [ ] Monitoreo y logs
- [ ] Capacitación de usuarios
- [ ] Go-live

---

## 7. Checklist de Mejoras Críticas

### ✅ Base de Datos
- [ ] Crear tabla `document_types`
- [ ] Crear tabla `document_packages`
- [ ] Crear tabla `document_package_items`
- [ ] Crear tabla `signature_links`
- [ ] Crear tabla `signature_workflow_steps`
- [ ] Crear tabla `beneficiary_documents`
- [ ] Crear tabla `whatsapp_messages`
- [ ] Crear tabla `sale_workflow_states`
- [ ] Mejorar tabla `beneficiaries` (campos adicionales)
- [ ] Mejorar tabla `sales` (campos de workflow)
- [ ] Mejorar tabla `documents` (firma y versiones)
- [ ] Mejorar tabla `templates` (generación dinámica)

### ✅ Funcionalidad
- [ ] Gestión completa de adherentes
- [ ] Carga de documentos por adherente
- [ ] DDJJ de Salud integrada
- [ ] Generación de paquetes de documentos
- [ ] Enlaces únicos de firma
- [ ] Firma digital mejorada
- [ ] Envío por WhatsApp
- [ ] Sistema de recordatorios
- [ ] Dashboard de auditor
- [ ] Aprobación/rechazo de ventas
- [ ] Templates dinámicos
- [ ] Generación de PDFs firmados

### ✅ Seguridad y Permisos
- [ ] Sistema de permisos granular
- [ ] 4 roles bien definidos
- [ ] RLS en Supabase
- [ ] Validación de tokens
- [ ] Registro de auditoría completo
- [ ] Protección de datos sensibles

### ✅ Experiencia de Usuario
- [ ] Flujo visual claro
- [ ] Estados de venta intuitivos
- [ ] Notificaciones en tiempo real
- [ ] Interfaz responsive
- [ ] Mensajes de error claros
- [ ] Confirmaciones de acciones críticas

---

## 8. Consideraciones Técnicas Adicionales

### 8.1 Seguridad

```typescript
// Validación de firma digital
export const validateSignature = (signatureData: string): boolean => {
  // Verificar que no esté vacía
  if (!signatureData || signatureData.length < 100) {
    return false;
  }
  
  // Verificar formato base64
  const base64Pattern = /^data:image\/(png|jpeg|jpg);base64,/;
  if (!base64Pattern.test(signatureData)) {
    return false;
  }
  
  return true;
};

// Sanitización de entrada
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
};
```

### 8.2 Performance

```typescript
// Paginación para listas grandes
export const usePaginatedSales = (pageSize: number = 20) => {
  const [page, setPage] = useState(0);
  
  const { data, isLoading } = useQuery({
    queryKey: ['sales', page],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .range(from, to)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    },
  });
  
  return { data, isLoading, page, setPage };
};
```

### 8.3 Monitoreo

```typescript
// Logging de eventos críticos
export const logCriticalEvent = async (
  event: string,
  data: any,
  userId?: string
) => {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: event,
    entity_type: 'system',
    new_values: data,
    created_at: new Date().toISOString(),
  });
  
  // También enviar a servicio de monitoreo externo si está configurado
  if (import.meta.env.VITE_MONITORING_ENABLED) {
    // Implementar según servicio (Sentry, LogRocket, etc.)
  }
};
```

---

## 9. Próximos Pasos Recomendados

1. **Revisión del Plan** ✅
   - Validar con stakeholders
   - Ajustar tiempos según recursos disponibles
   - Priorizar features críticos

2. **Setup del Ambiente** 🔧
   - Configurar Supabase desarrollo
   - Configurar API de WhatsApp en sandbox
   - Preparar datos de prueba

3. **Comenzar Fase 1** 🚀
   - Ejecutar migraciones de BD
   - Crear primeras Edge Functions
   - Setup de RLS

4. **Documentación Continua** 📝
   - Mantener README actualizado
   - Documentar APIs
   - Crear guías de usuario

---

## Conclusión

Este plan provee una hoja de ruta completa para transformar el sistema actual en una plataforma robusta de gestión de ventas con firma digital integrada. Las mejoras propuestas cubren:

✅ **Estructura de base de datos completa** para soportar todo el flujo
✅ **4 roles bien definidos** con permisos granulares
✅ **Flujo de firma digital end-to-end** desde vendedor hasta auditor
✅ **Integración con WhatsApp** para comunicación automatizada
✅ **Gestión completa de adherentes** con documentación
✅ **Sistema modular y escalable** para multiempresa
✅ **Auditoría completa** de todas las acciones
✅ **UX mejorada** con estados visuales claros

El sistema resultante será una solución profesional, segura y fácil de usar para la venta de seguros médicos con firma digital.

---

**Autor:** Claude (Anthropic)  
**Fecha:** Febrero 2026  
**Versión:** 1.0
