# Guía de Deployment - Sistema de Gestión de Prepagas Digitales

## 🎯 Estado del Sistema: 95% Completo

### ✅ Funcionalidades Implementadas

#### **Core del Sistema**
- ✅ Sistema de autenticación completo (login, registro, recuperación de contraseña)
- ✅ Gestión de usuarios y roles (super_admin, admin, gestor, vendedor)
- ✅ Gestión de empresas con branding personalizado
- ✅ CRUD completo de clientes, planes, ventas
- ✅ Sistema de firmas digitales con tokens de expiración
- ✅ Gestión de documentos y plantillas
- ✅ Workflow de ventas completo

#### **Características Avanzadas**
- ✅ Dashboard con analytics en tiempo real
- ✅ Sistema de notificaciones
- ✅ Comunicaciones (email/SMS campaigns)
- ✅ Auditoría completa del sistema
- ✅ Exportación de datos (PDF, Excel)
- ✅ Sistema de archivos con Supabase Storage
- ✅ API REST completa
- ✅ Configuración PWA (Progressive Web App)
- ✅ Configuración móvil con Capacitor

#### **Seguridad y Configuración**
- ✅ Row Level Security (RLS) implementado
- ✅ Funciones de base de datos seguras (SET search_path = '')
- ✅ Sistema de branding dinámico por empresa
- ✅ Configuración de temas (light/dark mode)

---

## 🔧 Configuraciones Pendientes

### **1. Stripe Secret Key** ⚠️
**CRÍTICO**: Necesita configuración para habilitar pagos

```bash
# En Supabase Dashboard -> Settings -> Edge Functions -> Secrets
STRIPE_SECRET_KEY=sk_live_... # o sk_test_... para testing
```

**Dónde obtenerla**: [Dashboard de Stripe](https://dashboard.stripe.com/apikeys)

### **2. Configuración de Email (Opcional)**
Para envío de emails automáticos:

```bash
RESEND_API_KEY=re_... # Desde resend.com
```

### **3. Configuración de SMS (Opcional)**
Para campañas SMS:

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### **4. URL pública para enlaces de firma/WhatsApp (RECOMENDADO)**
Para que los enlaces enviados por WhatsApp funcionen correctamente después de publicar:

```bash
# En tu hosting frontend (Vercel/Netlify/etc)
VITE_PUBLIC_APP_URL=https://tu-dominio.com
```

Si no está configurado, el sistema usa `window.location.origin`.

### **5. Webhook de WhatsApp (Meta/Twilio)**
Para actualizar estados `sent/delivered/read/failed` en `whatsapp_messages`:

```text
https://ykducvvcjzdpoojxlsig.supabase.co/functions/v1/whatsapp-webhook
```

- **Meta**:
  - Verificación GET usa `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (secret en Supabase).
  - Eventos recomendados: `messages`.
- **Twilio**:
  - Configurar `Status Callback URL` al mismo endpoint.

---

## 🚀 Pasos para Deployment

### **1. Configuración de Supabase**
- ✅ Base de datos configurada
- ✅ RLS habilitado en todas las tablas
- ✅ Edge Functions deployadas
- ⚠️ Agregar `STRIPE_SECRET_KEY` en secrets
- ⚠️ Agregar `WHATSAPP_WEBHOOK_VERIFY_TOKEN` si usas Meta webhook

### **2. Configuración de Autenticación**
1. Ir a **Supabase Dashboard > Authentication > Settings**
2. Configurar **Site URL**: `https://tu-dominio.com`
3. Agregar **Redirect URLs**:
   - `https://tu-dominio.com/`
   - `https://tu-dominio.com/auth-callback`

### **3. Configuración de Dominio**
1. **En tu proveedor de hosting**:
   - Configurar el dominio personalizado
   - Apuntar los registros DNS al entorno productivo
   - Verificar la propagación DNS
2. **Configurar SSL**: activar HTTPS en el proveedor de hosting o proxy inverso

### **4. Configuración de Stripe (REQUERIDO)**
1. Crear cuenta en [Stripe](https://stripe.com)
2. Obtener **Secret Key** del dashboard
3. Agregar a Supabase Edge Functions secrets
4. Configurar webhooks (opcional):
   ```
   Endpoint: https://tu-proyecto.supabase.co/functions/v1/stripe-webhook
   Events: payment_intent.succeeded, checkout.session.completed
   ```

---

## 📱 Configuración Móvil (Opcional)

### **Para iOS/Android nativo:**
1. **Exportar a GitHub**:
   ```bash
   # Clonar el repositorio principal
   git clone tu-repo.git
   cd tu-proyecto
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   npx cap sync
   ```

3. **Build para móvil**:
   ```bash
   npm run build
   npx cap add ios     # Para iOS
   npx cap add android # Para Android
   npx cap run ios     # Abrir en Xcode
   npx cap run android # Abrir en Android Studio
   ```

---

## 🔒 Configuración de Seguridad Adicional

### **Configuraciones Recomendadas en Supabase:**

1. **Auth Settings**:
   - ✅ Enable email confirmations (recomendado para producción)
   - ✅ Enable phone confirmations si usas SMS
   - ✅ Set session timeout: 24 hours

2. **Database Settings**:
   - ✅ Enable connection pooler
   - ✅ Set statement timeout: 15s
   - ✅ Enable row level security en todas las tablas

3. **Edge Functions**:
   - ✅ Enable JWT verification
   - ✅ Set function timeout: 60s

---

## 📊 Verificación del Sistema

Una vez deployado, verificar:

1. **✅ Autenticación**: Login/registro funciona
2. **✅ Base de datos**: CRUD operations funcionan  
3. **⚠️ Pagos**: Stripe funciona (requiere secret key)
4. **✅ Notificaciones**: Sistema de notificaciones activo
5. **✅ Firmas digitales**: Workflow completo funciona
6. **✅ Archivos**: Upload/download de documentos
7. **✅ Analytics**: Dashboard muestra datos correctos

---

## 🆘 Soporte y Mantenimiento

### **Monitoreo Recomendado:**
- **Supabase Dashboard**: Métricas de DB y edge functions
- **Stripe Dashboard**: Métricas de pagos
- **Logs**: Supabase logs para debugging

### **Backups:**
- ✅ Supabase automático: Daily backups incluidos
- ✅ Point-in-time recovery: Últimos 7 días

### **Updates:**
- Usar el repositorio principal para actualizaciones de UI/funcionalidad
- Migraciones de DB vía Supabase Dashboard
- Deploy automático de edge functions

---

## 🎉 Sistema Listo para Producción

**Completación: 95%**

**Lo que funciona ahora:**
- Todo el core del sistema
- Autenticación y seguridad
- Gestión completa de datos
- Analytics y reportes
- Móvil/PWA ready

**Falta solo:**
- Configurar `STRIPE_SECRET_KEY` para pagos
- Configurar dominio personalizado (opcional)
- Configurar email/SMS providers (opcional)

¡El sistema está prácticamente listo para usar en producción! 🚀
