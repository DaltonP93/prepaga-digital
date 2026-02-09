# FLUJO DE VENTA ACTUALIZADO - VERSIÓN 2.0
# Sistema SAMAP - Con Pestañas y Proceso Detallado

---

## CAMBIOS PRINCIPALES RESPECTO A VERSIÓN 1.0

### 🔄 Cambios Críticos Identificados:

1. **UI con Pestañas (Tabs)** - No formulario único
2. **Adherentes obligatorio** en el flujo
3. **Google Maps** para ubicación
4. **Monto NO editable** por vendedor (calculado automático)
5. **Empresa fija** (del vendedor logueado)
6. **Proceso paso a paso** con validación por etapa
7. **Auditoría antes de Templates** (nuevo flujo)
8. **DDJJ con opción WhatsApp** integrada
9. **Reenvío de enlaces** desde panel
10. **Carga de documentos** por pestaña separada

---

## FLUJO ACTUALIZADO COMPLETO

### FASE 1: CREACIÓN DE VENTA (Vendedor)

#### Pestaña 1: BÁSICO (Información de la Venta)

**Campos:**
```typescript
interface SaleBasicInfo {
  cliente: Cliente;           // Select + botón "Crear nuevo cliente"
  plan: Plan;                 // Select (filtrado por empresa)
  empresa: Company;           // READONLY - Auto del vendedor logueado
  monto_total: number;        // READONLY - Calculado del plan
  notas: string;              // Opcional - Textarea
}
```

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Editar Venta                                          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Básico] [Adherentes] [Documentos] [DDJJ Salud] [Templates]│
│  ────────                                                    │
│                                                              │
│  Cliente *                                                   │
│  ┌────────────────────────────────────────────┐  [+ Nuevo]  │
│  │ Juan Perez - dalton.perez@saa.com.py    ▼ │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  Plan *                                                      │
│  ┌────────────────────────────────────────────┐             │
│  │ Alfa - 180,000 Gs.                      ▼ │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  Empresa *                                                   │
│  ┌────────────────────────────────────────────┐             │
│  │ Prepaga Digital                    [🔒]    │  ← BLOQUEADO│
│  └────────────────────────────────────────────┘             │
│                                                              │
│  Monto Total (Gs.) *                                        │
│  ┌────────────────────────────────────────────┐             │
│  │ 180000                             [🔒]    │  ← BLOQUEADO│
│  └────────────────────────────────────────────┘             │
│  Precio del plan: 180,000 Gs.                               │
│                                                              │
│  Notas                                                       │
│  ┌────────────────────────────────────────────┐             │
│  │ prueba de venta                            │             │
│  │                                             │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│                    [Cancelar]  [Siguiente: Adherentes →]    │
└─────────────────────────────────────────────────────────────┘
```

**Validaciones:**
- ✅ Cliente seleccionado (obligatorio)
- ✅ Plan seleccionado (obligatorio)
- ✅ Monto calculado automáticamente
- ✅ Empresa tomada del vendedor logueado
- ✅ No permite editar empresa ni monto

**Lógica:**
```typescript
// Al seleccionar plan, auto-calcular monto
const handlePlanChange = (planId: string) => {
  const selectedPlan = plans.find(p => p.id === planId);
  
  // Monto base del plan
  let totalAmount = selectedPlan.price;
  
  // Si ya hay adherentes, sumar sus montos
  if (beneficiaries.length > 0) {
    totalAmount += beneficiaries.reduce((sum, b) => sum + b.amount, 0);
  }
  
  setFormData({
    ...formData,
    plan_id: planId,
    total_amount: totalAmount  // READONLY - solo lectura
  });
};

// Empresa siempre del usuario logueado
const companyId = user.company_id; // No editable
```

---

#### Pestaña 2: ADHERENTES

**Campos por adherente:**
```typescript
interface Beneficiary {
  // Datos Personales
  first_name: string;
  last_name: string;
  dni: string;
  document_type: 'CI' | 'Pasaporte' | 'RUC';
  birth_date: date;
  relationship: 'conyuge' | 'hijo' | 'padre' | 'madre' | 'otro';
  
  // Contacto
  email: string;
  phone: string;
  
  // Ubicación (Google Maps Integration)
  address: string;
  google_maps_link: string;  // URL de Google Maps
  latitude: number;
  longitude: number;
  city: string;
  province: string;
  
  // Información adicional
  gender: 'M' | 'F' | 'Otro';
  marital_status: string;
  occupation: string;
  
  // Salud
  has_preexisting_conditions: boolean;
  preexisting_conditions_detail: string;
  
  // Firma
  signature_required: boolean;  // Default: true
  
  // Monto
  amount: number;  // Monto específico para este adherente
}
```

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Editar Venta                                          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Básico] [Adherentes] [Documentos] [DDJJ Salud] [Templates]│
│         ────────────                                         │
│                                                              │
│  ADHERENTES / GRUPO FAMILIAR                                │
│  ───────────────────────────────────────────────────────────│
│                                                              │
│  ┌─ Adherente #1 ────────────────────────────────── [X] ───┐│
│  │                                                          ││
│  │  DATOS PERSONALES                                       ││
│  │  ────────────────                                       ││
│  │  Nombre *              Apellido *                       ││
│  │  [María              ] [Perez                ]          ││
│  │                                                          ││
│  │  Tipo Doc *            Nro Documento *                  ││
│  │  [CI               ▼] [3.456.789           ]           ││
│  │                                                          ││
│  │  Fecha Nacimiento *    Relación *                       ││
│  │  [15/08/1990       ] [Cónyuge            ▼]           ││
│  │                                                          ││
│  │  CONTACTO                                               ││
│  │  ────────                                               ││
│  │  Email *               Teléfono *                       ││
│  │  [maria@email.com  ] [+595 981 234 567  ]             ││
│  │                                                          ││
│  │  UBICACIÓN                                              ││
│  │  ─────────                                              ││
│  │  Dirección completa *                                   ││
│  │  [Av. Mariscal López 1234, c/ Brasil              ]    ││
│  │                                                          ││
│  │  [📍 Buscar en Google Maps]                            ││
│  │  ┌──────────────────────────────────────────────────┐  ││
│  │  │ 🗺️ Mini mapa de Google Maps                      │  ││
│  │  │ (muestra pin en ubicación seleccionada)          │  ││
│  │  └──────────────────────────────────────────────────┘  ││
│  │                                                          ││
│  │  Link Google Maps: [Ver en Google Maps ↗]              ││
│  │  Lat: -25.2867, Lng: -57.6470                          ││
│  │                                                          ││
│  │  Ciudad *              Provincia/Dpto *                 ││
│  │  [Asunción         ] [Central             ▼]          ││
│  │                                                          ││
│  │  INFORMACIÓN ADICIONAL                                  ││
│  │  ─────────────────────                                  ││
│  │  Género *              Estado Civil                     ││
│  │  [Femenino        ▼] [Casada             ▼]           ││
│  │                                                          ││
│  │  Ocupación                                              ││
│  │  [Docente                                        ]      ││
│  │                                                          ││
│  │  SALUD                                                  ││
│  │  ──────                                                 ││
│  │  ☐ Tiene condiciones preexistentes                     ││
│  │                                                          ││
│  │  [Si marcó ☑, mostrar textarea:]                       ││
│  │  Detalle de condiciones preexistentes                  ││
│  │  [Diabetes tipo 2, controlada con medicación    ]      ││
│  │                                                          ││
│  │  CONFIGURACIÓN                                          ││
│  │  ─────────────                                          ││
│  │  ☑ Requiere firma digital individual                   ││
│  │                                                          ││
│  │  Monto para este adherente (Gs.)                       ││
│  │  [80000                                          ]      ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  [+ Agregar Adherente]                                      │
│                                                              │
│  ═══════════════════════════════════════════════════════════│
│  RESUMEN                                                     │
│  ────────                                                    │
│  Titular (Juan Perez):        180,000 Gs.                   │
│  Adherente 1 (María Perez):    80,000 Gs.                   │
│  ────────────────────────────────────────                   │
│  TOTAL:                       260,000 Gs.                   │
│  ═══════════════════════════════════════════════════════════│
│                                                              │
│              [← Básico]  [Cancelar]  [Siguiente: Docs →]    │
└─────────────────────────────────────────────────────────────┘
```

**Integración Google Maps:**
```typescript
// Componente de selección de ubicación
const GoogleMapsLocationPicker = ({ onLocationSelect }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  
  // Inicializar mapa
  useEffect(() => {
    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: -25.2867, lng: -57.6470 }, // Asunción
      zoom: 13
    });
    
    setMap(mapInstance);
    
    // Click en mapa para seleccionar ubicación
    mapInstance.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      // Crear/mover marker
      if (marker) {
        marker.setPosition(e.latLng);
      } else {
        const newMarker = new google.maps.Marker({
          position: e.latLng,
          map: mapInstance
        });
        setMarker(newMarker);
      }
      
      // Obtener dirección con Geocoding
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: e.latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
          onLocationSelect({
            address: results[0].formatted_address,
            latitude: lat,
            longitude: lng,
            google_maps_link: `https://www.google.com/maps?q=${lat},${lng}`,
            city: extractCity(results[0]),
            province: extractProvince(results[0])
          });
        }
      });
    });
  }, []);
  
  return (
    <div>
      <div ref={mapRef} style={{ height: '300px', width: '100%' }} />
      <button onClick={() => {
        // Abrir Google Maps en nueva pestaña para búsqueda
        window.open('https://www.google.com/maps', '_blank');
      }}>
        📍 Buscar en Google Maps
      </button>
    </div>
  );
};
```

**Validaciones Pestaña Adherentes:**
- ✅ Al menos 0 adherentes (puede ser solo titular)
- ✅ Si hay adherentes, todos los campos obligatorios completos
- ✅ Email válido para cada adherente
- ✅ Ubicación con Google Maps seleccionada
- ✅ Monto recalculado automáticamente

**Auto-cálculo de monto:**
```typescript
// Cuando se agregan/eliminan adherentes o cambian sus montos
const recalculateTotalAmount = () => {
  const planBaseAmount = selectedPlan.price;
  const beneficiariesTotal = beneficiaries.reduce((sum, b) => sum + b.amount, 0);
  
  const newTotal = planBaseAmount + beneficiariesTotal;
  
  // Actualizar en pestaña Básico (readonly)
  updateSale({ total_amount: newTotal });
};
```

---

#### Pestaña 3: DOCUMENTOS

**Propósito:** Subir documentos escaneados del titular y adherentes

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Editar Venta                                          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Básico] [Adherentes] [Documentos] [DDJJ Salud] [Templates]│
│                      ───────────                             │
│                                                              │
│  DOCUMENTOS REQUERIDOS                                       │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  📄 DOCUMENTOS DEL TITULAR (Juan Perez)                     │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ✓ Cédula de Identidad *                                    │
│    [📎 CI_Juan_Perez.pdf] [👁️ Ver] [🗑️ Eliminar]           │
│    Subido: 05/02/2026 10:30                                 │
│                                                              │
│  ✓ Comprobante de Domicilio *                               │
│    [📎 Comprobante_Luz.jpg] [👁️ Ver] [🗑️ Eliminar]         │
│    Subido: 05/02/2026 10:32                                 │
│                                                              │
│  ⚠ Certificado Médico (si aplica)                           │
│    [📤 Subir archivo] o [Arrastrar aquí]                    │
│    Formatos: PDF, JPG, PNG, DOCX (Max 10MB)                │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  📄 DOCUMENTOS DE ADHERENTES                                │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ┌─ Adherente 1: María Perez ───────────────────────────┐  │
│  │                                                        │  │
│  │  ✓ Cédula de Identidad *                              │  │
│  │    [📎 CI_Maria_Perez.jpg] [👁️ Ver] [🗑️]             │  │
│  │                                                        │  │
│  │  ✓ Certificado Médico *                               │  │
│  │    [📎 Cert_Maria.pdf] [👁️ Ver] [🗑️]                 │  │
│  │    (Requerido por condiciones preexistentes)          │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Adherente 2: Pedro Perez ────────────────────────────┐  │
│  │                                                        │  │
│  │  ⚠ Cédula de Identidad *                              │  │
│  │    [📤 Subir archivo]                                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ════════════════════════════════════════════════════════   │
│  PROGRESO: 5 de 6 documentos subidos                        │
│  ████████████████████████░░ 83%                             │
│  ════════════════════════════════════════════════════════   │
│                                                              │
│         [← Adherentes]  [Cancelar]  [Siguiente: DDJJ →]     │
└─────────────────────────────────────────────────────────────┘
```

**Lógica de documentos requeridos:**
```typescript
interface RequiredDocument {
  type: 'ci_titular' | 'ci_adherente' | 'comprobante_domicilio' | 'certificado_medico';
  for: 'titular' | 'adherente';
  beneficiary_id?: string;
  is_required: boolean;
  uploaded: boolean;
  file?: File;
  file_url?: string;
}

// Calcular documentos requeridos
const getRequiredDocuments = (sale: Sale) => {
  const docs: RequiredDocument[] = [];
  
  // Titular siempre requiere
  docs.push({
    type: 'ci_titular',
    for: 'titular',
    is_required: true,
    uploaded: false
  });
  
  docs.push({
    type: 'comprobante_domicilio',
    for: 'titular',
    is_required: true,
    uploaded: false
  });
  
  // Si titular tiene condiciones preexistentes
  if (sale.client.has_preexisting_conditions) {
    docs.push({
      type: 'certificado_medico',
      for: 'titular',
      is_required: true,
      uploaded: false
    });
  }
  
  // Para cada adherente
  sale.beneficiaries.forEach(ben => {
    docs.push({
      type: 'ci_adherente',
      for: 'adherente',
      beneficiary_id: ben.id,
      is_required: true,
      uploaded: false
    });
    
    if (ben.has_preexisting_conditions) {
      docs.push({
        type: 'certificado_medico',
        for: 'adherente',
        beneficiary_id: ben.id,
        is_required: true,
        uploaded: false
      });
    }
  });
  
  return docs;
};

// Upload con validación
const handleFileUpload = async (file: File, docType: string, beneficiaryId?: string) => {
  // Validar tamaño
  if (file.size > 10 * 1024 * 1024) { // 10MB
    toast.error('Archivo muy grande. Máximo 10MB');
    return;
  }
  
  // Validar tipo
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Tipo de archivo no permitido');
    return;
  }
  
  // Upload a Supabase Storage
  const fileName = `${sale.id}/${docType}_${beneficiaryId || 'titular'}_${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file);
  
  if (error) throw error;
  
  // Guardar en tabla documents
  await supabase.from('documents').insert({
    sale_id: sale.id,
    document_type: docType,
    beneficiary_id: beneficiaryId,
    name: file.name,
    file_url: data.path,
    status: 'pendiente'
  });
  
  toast.success('Documento subido correctamente');
};
```

**Validaciones:**
- ✅ Todos los documentos OBLIGATORIOS subidos
- ✅ Archivos en formato válido (PDF, JPG, PNG, DOCX)
- ✅ Tamaño máximo 10MB por archivo
- ⚠️ Warning si faltan documentos opcionales

---

#### Pestaña 4: DDJJ SALUD (Declaración Jurada de Salud)

**Dos opciones:**
1. **Completar manualmente** (vendedor con cliente)
2. **Enviar por WhatsApp** (cliente completa online)

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Editar Venta                                          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Básico] [Adherentes] [Documentos] [DDJJ Salud] [Templates]│
│                                   ──────────                 │
│                                                              │
│  DECLARACIÓN JURADA DE SALUD                                │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  Seleccione cómo desea completar las DDJJ de Salud:         │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │  📝 COMPLETAR      │  │  📱 ENVIAR POR     │            │
│  │  MANUALMENTE       │  │  WHATSAPP          │            │
│  │                    │  │                    │            │
│  │  El vendedor       │  │  El cliente        │            │
│  │  completa con      │  │  completa desde    │            │
│  │  el cliente        │  │  su celular        │            │
│  │                    │  │                    │            │
│  │  [Completar Ahora] │  │  [Enviar Enlaces]  │            │
│  └────────────────────┘  └────────────────────┘            │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ESTADO DE DDJJ                                             │
│  ════════════════════════════════════════════════════════   │
│                                                              │
│  ┌─ Titular: Juan Perez ─────────────────────────────────┐ │
│  │  Estado: ✅ COMPLETADA                                │ │
│  │  Fecha: 05/02/2026 11:15                              │ │
│  │  Método: Manual                                       │ │
│  │  [👁️ Ver Respuestas] [✏️ Editar] [📄 PDF]            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Adherente 1: María Perez ───────────────────────────┐  │
│  │  Estado: ⏳ PENDIENTE                                 │  │
│  │  Enviado por WhatsApp: 05/02/2026 10:45              │  │
│  │  Link: https://app.com/ddjj/token123                 │  │
│  │  Expira: 06/02/2026 10:45 (23:30 restantes)          │  │
│  │  [🔄 Reenviar] [📋 Copiar Link] [✏️ Completar Manual] │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Adherente 2: Pedro Perez (12 años) ─────────────────┐  │
│  │  Estado: ✅ COMPLETADA                                │  │
│  │  Fecha: 05/02/2026 11:20                              │  │
│  │  Completado por: Padre (Juan Perez)                  │  │
│  │  [👁️ Ver Respuestas] [✏️ Editar] [📄 PDF]            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ════════════════════════════════════════════════════════   │
│  PROGRESO: 2 de 3 DDJJ completadas                          │
│  ████████████████░░░░░░░░ 67%                               │
│  ════════════════════════════════════════════════════════   │
│                                                              │
│  ⚠️ Debe completarse todas las DDJJ para continuar          │
│                                                              │
│         [← Documentos]  [Cancelar]  [Guardar y Cerrar]      │
└─────────────────────────────────────────────────────────────┘
```

**OPCIÓN A: Completar Manual**

Muestra formulario con preguntas estándar:

```
┌─────────────────────────────────────────────────────────────┐
│ DDJJ Salud - Juan Perez                             [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DECLARACIÓN JURADA DE SALUD                                │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  1. ¿Padece o ha padecido alguna enfermedad crónica?        │
│     ○ Sí  ● No                                              │
│                                                              │
│  2. ¿Está tomando algún medicamento actualmente?            │
│     ● Sí  ○ No                                              │
│                                                              │
│     [Si Sí] ¿Cuál(es)?                                      │
│     [Metformina 500mg para diabetes                  ]      │
│                                                              │
│  3. ¿Ha sido hospitalizado en los últimos 5 años?           │
│     ○ Sí  ● No                                              │
│                                                              │
│  4. ¿Tiene alergias conocidas?                              │
│     ● Sí  ○ No                                              │
│                                                              │
│     [Si Sí] ¿Cuál(es)?                                      │
│     [Penicilina                                      ]      │
│                                                              │
│  5. ¿Fuma?                                                   │
│     ○ Sí  ● No                                              │
│                                                              │
│  ... (más preguntas según template de empresa)              │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  DECLARACIÓN                                                │
│  ──────────                                                 │
│  ☑ Declaro que la información proporcionada es verdadera    │
│    y completa.                                              │
│                                                              │
│                      [Cancelar]  [Guardar DDJJ]             │
└─────────────────────────────────────────────────────────────┘
```

**OPCIÓN B: Enviar por WhatsApp**

```typescript
// Generar link único para DDJJ
const generateDDJJLink = async (saleId: string, recipientType: 'titular' | 'adherente', recipientId?: string) => {
  const token = generateSecureToken(32);
  
  const { data: link } = await supabase
    .from('ddjj_links')
    .insert({
      sale_id: saleId,
      recipient_type: recipientType,
      recipient_id: recipientId,
      token,
      expires_at: addHours(new Date(), 24).toISOString(),
      status: 'pendiente'
    })
    .select()
    .single();
  
  // Enviar WhatsApp
  await sendWhatsAppMessage({
    phone: recipient.phone,
    message_type: 'ddjj_link',
    data: {
      recipient_name: `${recipient.first_name} ${recipient.last_name}`,
      ddjj_url: `${APP_URL}/ddjj/${token}`,
      expiration: '24 horas'
    }
  });
  
  return link;
};

// Mensaje WhatsApp para DDJJ
const DDJJ_WHATSAPP_TEMPLATE = `
🏥 *SAMAP - Declaración Jurada de Salud*

Hola {{nombre}}! 👋

Para completar su solicitud de seguro médico, necesitamos que complete su Declaración Jurada de Salud.

📋 Complete aquí:
{{url}}

⏰ Válido por 24 horas
⏱️ Tiempo estimado: 5-10 minutos

Es importante que responda con sinceridad para procesar correctamente su solicitud.

¿Dudas? Responda este mensaje.

Saludos,
Equipo SAMAP
`;
```

**Validación antes de continuar:**
```typescript
const canProceedToTemplates = () => {
  // Verificar que TODAS las DDJJ estén completadas
  const totalRequired = 1 + beneficiaries.filter(b => b.age >= 18).length;
  const totalCompleted = ddjjStatuses.filter(d => d.status === 'completada').length;
  
  if (totalCompleted < totalRequired) {
    toast.error('Debe completarse todas las DDJJ para continuar');
    return false;
  }
  
  return true;
};
```

---

### 🔴 PUNTO DE PARADA: AUDITORÍA

**IMPORTANTE:** Después de completar DDJJ, la venta NO pasa directamente a Templates.

**Nuevo flujo:**
```
DDJJ Completada
      ↓
  GUARDAR VENTA
      ↓
  Estado: "en_revision"
      ↓
  AUDITOR REVISA
      ↓
  ¿Aprobado?
      ↓
    SÍ → Puede continuar a Templates
      ↓
    NO → Vuelve a vendedor con observaciones
```

**UI cuando vendedor guarda:**
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ VENTA GUARDADA CORRECTAMENTE                            │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  La venta ha sido enviada a revisión.                       │
│                                                              │
│  📋 Nro. Venta: #SAMP-2026-000123                           │
│  👤 Cliente: Juan Perez                                     │
│  📊 Estado: EN REVISIÓN                                     │
│                                                              │
│  ⏳ Esperando aprobación del auditor                        │
│                                                              │
│  Una vez aprobada, podrá continuar con el envío de          │
│  documentos para firma.                                     │
│                                                              │
│                          [Volver a Ventas]                  │
└─────────────────────────────────────────────────────────────┘
```

---

### FASE 2: AUDITORÍA

#### Panel del Auditor

**UI del auditor:**
```
┌─────────────────────────────────────────────────────────────┐
│ AUDITORÍA DE VENTAS                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filtros: [Pendientes ▼] [Todas las empresas ▼]            │
│                                                              │
│  ┌─ Venta #SAMP-2026-000123 ──────────────── [REVISAR] ───┐│
│  │ Cliente: Juan Perez                                     ││
│  │ Plan: Alfa - 260,000 Gs.                                ││
│  │ Vendedor: Carlos Rodriguez                              ││
│  │ Fecha: 05/02/2026                                       ││
│  │ Adherentes: 2                                           ││
│  │ Estado: 🟡 EN REVISIÓN                                  ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Vista de revisión detallada:**
```
┌─────────────────────────────────────────────────────────────┐
│ Auditoría - Venta #SAMP-2026-000123                   [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Información] [Adherentes] [Documentos] [DDJJ] [Decisión]  │
│  ────────────                                                │
│                                                              │
│  INFORMACIÓN DE LA VENTA                                    │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  Cliente: Juan Perez (juan@email.com)                       │
│  DNI: 1.234.567                                             │
│  Teléfono: +595 981 234 567                                 │
│                                                              │
│  Plan: Alfa - 180,000 Gs./mes                               │
│  Adherentes: 2 personas                                     │
│  Monto Total: 260,000 Gs./mes                               │
│                                                              │
│  Vendedor: Carlos Rodriguez                                 │
│  Fecha Creación: 05/02/2026 10:00                           │
│  Fecha Revisión: 05/02/2026 14:30                           │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  CHECKLIST DE REVISIÓN                                      │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  ☑ Datos del cliente completos y correctos                  │
│  ☑ Adherentes registrados correctamente                     │
│  ☑ Documentos adjuntos (CI, comprobantes)                   │
│  ☑ DDJJ de Salud completadas                                │
│  ☑ Información de ubicación con Google Maps                 │
│  ☑ Monto calculado correctamente                            │
│  ☑ Sin inconsistencias detectadas                           │
│                                                              │
│  Ir a pestaña [Decisión] para aprobar/rechazar              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Pestaña Decisión:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Información] [Adherentes] [Documentos] [DDJJ] [Decisión]  │
│                                                   ────────   │
│                                                              │
│  DECISIÓN DE AUDITORÍA                                      │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  ● Aprobar    ○ Rechazar                                    │
│                                                              │
│  [Si Aprobar:]                                              │
│  La venta pasará al proceso de generación de templates      │
│  y firma digital.                                           │
│                                                              │
│  [Si Rechazar:]                                             │
│  Observaciones / Motivo del rechazo *                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Falta certificado médico del adherente María Perez.   │ │
│  │ Debe adjuntar antes de continuar.                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Notas adicionales (opcional)                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│                        [Cancelar]  [Confirmar Decisión]     │
└─────────────────────────────────────────────────────────────┘
```

**Lógica de aprobación:**
```typescript
const handleAuditorDecision = async (decision: 'approved' | 'rejected', notes: string) => {
  if (decision === 'approved') {
    // Aprobar venta
    await supabase
      .from('sales')
      .update({
        status: 'aprobado_para_templates',
        auditor_id: auditor.id,
        audited_at: new Date().toISOString(),
        audit_status: 'aprobado',
        audit_notes: notes
      })
      .eq('id', saleId);
    
    // Notificar vendedor
    await sendNotification({
      user_id: sale.salesperson_id,
      type: 'sale_approved',
      message: `Venta #${sale.contract_number} aprobada. Puede continuar con templates.`
    });
    
    toast.success('Venta aprobada correctamente');
    
  } else {
    // Rechazar venta
    await supabase
      .from('sales')
      .update({
        status: 'rechazado',
        auditor_id: auditor.id,
        audited_at: new Date().toISOString(),
        audit_status: 'rechazado',
        audit_notes: notes
      })
      .eq('id', saleId);
    
    // Notificar vendedor
    await sendNotification({
      user_id: sale.salesperson_id,
      type: 'sale_rejected',
      message: `Venta #${sale.contract_number} rechazada. Motivo: ${notes}`
    });
    
    toast.error('Venta rechazada');
  }
};
```

---

### FASE 3: TEMPLATES (Solo si aprobado por auditor)

**Condición:** `status = 'aprobado_para_templates'`

#### Pestaña 5: TEMPLATES

**El vendedor puede continuar solo si la venta fue aprobada:**

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Editar Venta #SAMP-2026-000123                        [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Básico] [Adherentes] [Documentos] [DDJJ Salud] [Templates]│
│                                                   ─────────  │
│                                                              │
│  ✅ Venta aprobada por auditor                              │
│  Auditor: María González                                    │
│  Fecha: 05/02/2026 15:00                                    │
│                                                              │
│  SELECCIÓN DE DOCUMENTOS PARA FIRMA                         │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  Seleccione los documentos que desea enviar al cliente      │
│  para firma digital:                                        │
│                                                              │
│  DOCUMENTOS GENERADOS AUTOMÁTICAMENTE                       │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  ┌─ 📄 Contrato de Prestación de Servicios ─────────────┐  │
│  │  ☑ Enviar para firma                                 │  │
│  │  [👁️ Vista Previa] [✏️ Editar] [🔄 Regenerar]        │  │
│  │                                                       │  │
│  │  Generado con datos de:                              │  │
│  │  • Titular: Juan Perez                               │  │
│  │  • Plan: Alfa - 260,000 Gs./mes                      │  │
│  │  • Adherentes: María Perez, Pedro Perez              │  │
│  │                                                       │  │
│  │  Firma requerida: ● Sí  ○ No                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ 📄 Declaración Jurada de Salud - Juan Perez ────────┐  │
│  │  ☑ Enviar para firma                                 │  │
│  │  [👁️ Vista Previa] [📄 Ver Respuestas]               │  │
│  │                                                       │  │
│  │  DDJJ completada: 05/02/2026 11:15                   │  │
│  │  Método: Manual                                      │  │
│  │  Firma requerida: ● Sí  ○ No                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ 📄 Declaración Jurada de Salud - María Perez ───────┐  │
│  │  ☑ Enviar para firma                                 │  │
│  │  [👁️ Vista Previa]                                   │  │
│  │                                                       │  │
│  │  DDJJ completada: 05/02/2026 12:30 (WhatsApp)        │  │
│  │  Firma requerida: ● Sí  ○ No                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  TEMPLATES ADICIONALES (Opcional)                           │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  ┌─ 📄 Anexo A - Condiciones Generales ─────────────────┐  │
│  │  ☑ Incluir (solo lectura, no requiere firma)         │  │
│  │  [👁️ Vista Previa]                                   │  │
│  │                                                       │  │
│  │  Firma requerida: ○ Sí  ● No                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ 📄 Anexo B - Cobertura Detallada ────────────────────┐  │
│  │  ☐ Incluir                                            │  │
│  │  [👁️ Vista Previa]                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ══════════════════════════════════════════════════════════ │
│  RESUMEN DE ENVÍO                                           │
│  ────────────────────────────────────────────────────────── │
│  Documentos seleccionados: 4                                │
│  Requieren firma: 3                                         │
│  Solo lectura: 1                                            │
│                                                              │
│  Se enviarán enlaces por WhatsApp a:                        │
│  • Juan Perez (+595 981 234 567)                            │
│  • María Perez (+595 981 234 568)                           │
│                                                              │
│  Vigencia de enlaces: 48 horas                              │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│              [← DDJJ]  [Cancelar]  [Enviar para Firma 📱]   │
└─────────────────────────────────────────────────────────────┘
```

**Lógica de generación de documentos:**
```typescript
const generateContractFromTemplate = async (saleId: string) => {
  // 1. Obtener venta completa con todos los datos
  const { data: sale } = await supabase
    .from('sales')
    .select(`
      *,
      clients (*),
      plans (*),
      beneficiaries (*),
      company:companies (*)
    `)
    .eq('id', saleId)
    .single();
  
  // 2. Obtener template de contrato de la empresa
  const { data: template } = await supabase
    .from('templates')
    .select('*')
    .eq('company_id', sale.company_id)
    .eq('template_type', 'contrato')
    .eq('is_active', true)
    .single();
  
  // 3. Reemplazar placeholders con datos reales
  let contractContent = template.content;
  
  const placeholders = {
    '{{titular_nombre_completo}}': `${sale.clients.first_name} ${sale.clients.last_name}`,
    '{{titular_dni}}': sale.clients.dni,
    '{{titular_direccion}}': sale.clients.address,
    '{{titular_ciudad}}': sale.clients.city,
    '{{titular_email}}': sale.clients.email,
    '{{titular_telefono}}': sale.clients.phone,
    '{{plan_nombre}}': sale.plans.name,
    '{{plan_precio}}': formatCurrency(sale.plans.price),
    '{{monto_total}}': formatCurrency(sale.total_amount),
    '{{fecha_contrato}}': formatDate(new Date()),
    '{{numero_contrato}}': sale.contract_number,
    '{{empresa_nombre}}': sale.company.name,
    '{{empresa_direccion}}': sale.company.address,
    '{{adherentes_listado}}': generateBeneficiariesList(sale.beneficiaries)
  };
  
  Object.entries(placeholders).forEach(([key, value]) => {
    contractContent = contractContent.replace(new RegExp(key, 'g'), value);
  });
  
  // 4. Generar PDF
  const pdfBuffer = await generatePDF(contractContent);
  
  // 5. Subir a Storage
  const fileName = `${saleId}/contrato_${Date.now()}.pdf`;
  await supabase.storage
    .from('documents')
    .upload(fileName, pdfBuffer);
  
  // 6. Crear registro en tabla documents
  const { data: document } = await supabase
    .from('documents')
    .insert({
      sale_id: saleId,
      document_type_id: contractDocTypeId,
      name: 'Contrato de Prestación de Servicios',
      file_url: fileName,
      status: 'generado',
      generated_from_template: true,
      requires_signature: true
    })
    .select()
    .single();
  
  return document;
};

// Generar listado de adherentes para template
const generateBeneficiariesList = (beneficiaries: Beneficiary[]) => {
  if (beneficiaries.length === 0) return 'No aplica';
  
  return beneficiaries.map((b, i) => 
    `${i + 1}. ${b.first_name} ${b.last_name} (${b.relationship}) - DNI: ${b.dni}`
  ).join('\n');
};
```

**Al hacer clic en "Enviar para Firma":**
```typescript
const handleSendForSignature = async () => {
  // 1. Validar selección
  const selectedDocs = documents.filter(d => d.selected);
  if (selectedDocs.length === 0) {
    toast.error('Debe seleccionar al menos un documento');
    return;
  }
  
  // 2. Crear paquete de documentos
  const { data: package } = await supabase
    .from('document_packages')
    .insert({
      sale_id: sale.id,
      package_type: 'firma_cliente',
      name: 'Paquete de Firma Digital',
      created_by: user.id
    })
    .select()
    .single();
  
  // 3. Agregar documentos al paquete
  for (const doc of selectedDocs) {
    await supabase
      .from('document_package_items')
      .insert({
        package_id: package.id,
        document_id: doc.id,
        is_required: doc.requires_signature
      });
  }
  
  // 4. Generar enlaces de firma
  const { data: links } = await supabase.functions.invoke(
    'generate-signature-link',
    {
      body: {
        sale_id: sale.id,
        package_id: package.id,
        expiration_hours: 48
      }
    }
  );
  
  // 5. Actualizar estado de venta
  await supabase
    .from('sales')
    .update({
      status: 'enviado',
      signature_sent_at: new Date().toISOString()
    })
    .eq('id', sale.id);
  
  // 6. Mostrar confirmación
  toast.success('Enlaces enviados por WhatsApp');
  navigate(`/sales/${sale.id}/tracking`);
};
```

---

### FASE 4: SEGUIMIENTO DE FIRMAS

**Nueva vista: Panel de Seguimiento**

**URL:** `/sales/{id}/tracking`

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Seguimiento de Firmas - Venta #SAMP-2026-000123            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [← Volver a Ventas]                                        │
│                                                              │
│  ESTADO GENERAL                                             │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  Cliente: Juan Perez                                        │
│  Estado: 🟡 ESPERANDO FIRMAS (1 de 2 completadas)           │
│  Enviado: 05/02/2026 16:30                                  │
│  Expira: 07/02/2026 16:30                                   │
│                                                              │
│  ════════════════════════════════════════════════════════   │
│  PROGRESO: 1 de 2 firmas recibidas                          │
│  ████████████████░░░░░░░░ 50%                               │
│  ════════════════════════════════════════════════════════   │
│                                                              │
│  DETALLE DE FIRMAS                                          │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  ┌─ 👤 Juan Perez (Titular) ─────────────────────────────┐ │
│  │                                                        │ │
│  │  Estado: ✅ FIRMADO                                    │ │
│  │  Fecha: 05/02/2026 18:45                              │ │
│  │  IP: 200.1.2.3                                        │ │
│  │  Dispositivo: iPhone 13 (Safari)                      │ │
│  │                                                        │ │
│  │  Documentos firmados:                                 │ │
│  │  • ✅ Contrato de Prestación de Servicios             │ │
│  │  • ✅ Declaración Jurada de Salud                     │ │
│  │                                                        │ │
│  │  [📄 Ver Firma] [⬇️ Descargar PDFs Firmados]          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ 👤 María Perez (Adherente - Cónyuge) ────────────────┐ │
│  │                                                        │ │
│  │  Estado: ⏳ PENDIENTE                                  │ │
│  │  Enlace enviado: 05/02/2026 16:30                     │ │
│  │  Último acceso: 05/02/2026 17:15 (visto)              │ │
│  │  Expira en: 1 día 23 horas                            │ │
│  │                                                        │ │
│  │  📱 WhatsApp: Entregado ✓✓                            │ │
│  │  👀 Enlace abierto: Sí (2 veces)                      │ │
│  │                                                        │ │
│  │  Documentos pendientes:                               │ │
│  │  • ⏳ Declaración Jurada de Salud                     │ │
│  │                                                        │ │
│  │  [🔄 Reenviar por WhatsApp]  [📋 Copiar Enlace]      │ │
│  │  [📞 Llamar]                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ══════════════════════════════════════════════════════════ │
│                                                              │
│  HISTORIAL DE EVENTOS                                       │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  🕐 05/02/2026 18:45 - Juan Perez completó firma            │
│  🕐 05/02/2026 17:15 - María Perez abrió el enlace          │
│  🕐 05/02/2026 16:45 - WhatsApp entregado a María Perez     │
│  🕐 05/02/2026 16:30 - Enlaces enviados                     │
│  🕐 05/02/2026 16:25 - Documentos generados                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidad de reenvío:**
```typescript
const handleResendSignatureLink = async (linkId: string) => {
  // 1. Obtener enlace
  const { data: link } = await supabase
    .from('signature_links')
    .select('*')
    .eq('id', linkId)
    .single();
  
  // 2. Verificar si ya expiró
  if (new Date(link.expires_at) < new Date()) {
    // Generar nuevo token y extender expiración
    const newToken = generateSecureToken(32);
    await supabase
      .from('signature_links')
      .update({
        token: newToken,
        expires_at: addHours(new Date(), 48).toISOString(),
        status: 'pendiente'
      })
      .eq('id', linkId);
  }
  
  // 3. Reenviar WhatsApp
  await supabase.functions.invoke('send-whatsapp-message', {
    body: {
      company_id: link.company_id,
      phone_number: link.recipient_phone,
      message_type: 'signature_link_reminder',
      data: {
        recipient_name: link.recipient_email.split('@')[0],
        signature_url: `${APP_URL}/firma/${link.token}`
      }
    }
  });
  
  toast.success('Enlace reenviado por WhatsApp');
};
```

---

## RESUMEN DE CAMBIOS EN BASE DE DATOS

### Nuevas columnas en `sales`:
```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signature_sent_at timestamptz;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS google_maps_link text;
```

### Nuevas columnas en `beneficiaries`:
```sql
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS google_maps_link text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
```

### Nueva tabla: `ddjj_links`
```sql
CREATE TABLE IF NOT EXISTS public.ddjj_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  recipient_type varchar NOT NULL,
  recipient_id uuid,
  token varchar NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accessed_at timestamptz,
  status varchar DEFAULT 'pendiente',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ddjj_links_token ON public.ddjj_links(token);
CREATE INDEX idx_ddjj_links_sale ON public.ddjj_links(sale_id);
```

### Nueva tabla: `ddjj_responses`
```sql
CREATE TABLE IF NOT EXISTS public.ddjj_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ddjj_link_id uuid REFERENCES public.ddjj_links(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  beneficiary_id uuid REFERENCES public.beneficiaries(id),
  question_id varchar NOT NULL,
  question_text text NOT NULL,
  answer_value text,
  answer_type varchar,
  created_at timestamptz DEFAULT now()
);
```

---

## ESTADOS DE VENTA ACTUALIZADOS

```typescript
type SaleStatus = 
  | 'borrador'                    // Creando venta (pestañas 1-4)
  | 'preparando_documentos'       // Subiendo archivos
  | 'esperando_ddjj'              // DDJJ pendientes
  | 'en_revision'                 // Esperando auditor ← NUEVO
  | 'rechazado'                   // Auditor rechazó ← NUEVO
  | 'aprobado_para_templates'     // Puede continuar ← NUEVO
  | 'listo_para_enviar'           // Templates seleccionados
  | 'enviado'                     // Enlaces enviados
  | 'firmado_parcial'             // Algunas firmas recibidas
  | 'firmado'                     // Todas las firmas completas
  | 'completado'                  // Proceso terminado
  | 'expirado'                    // Enlaces vencieron
  | 'cancelado';                  // Cancelado por vendedor/admin
```

---

## VALIDACIONES POR PESTAÑA

```typescript
// Validación antes de avanzar de pestaña
const tabValidations = {
  basico: () => {
    if (!formData.client_id) throw new Error('Debe seleccionar un cliente');
    if (!formData.plan_id) throw new Error('Debe seleccionar un plan');
    return true;
  },
  
  adherentes: () => {
    // Opcional - puede no tener adherentes
    for (const ben of beneficiaries) {
      if (!ben.first_name || !ben.last_name) {
        throw new Error('Complete todos los datos del adherente');
      }
      if (!ben.google_maps_link) {
        throw new Error('Debe seleccionar ubicación en Google Maps');
      }
    }
    return true;
  },
  
  documentos: () => {
    const required = getRequiredDocuments(sale);
    const uploaded = required.filter(d => d.uploaded);
    
    if (uploaded.length < required.filter(d => d.is_required).length) {
      throw new Error('Faltan documentos obligatorios');
    }
    return true;
  },
  
  ddjj: () => {
    const totalRequired = 1 + beneficiaries.filter(b => b.age >= 18).length;
    const completed = ddjjStatuses.filter(d => d.status === 'completada').length;
    
    if (completed < totalRequired) {
      throw new Error('Todas las DDJJ deben estar completadas');
    }
    return true;
  },
  
  templates: () => {
    // Solo accesible si status = 'aprobado_para_templates'
    if (sale.status !== 'aprobado_para_templates') {
      throw new Error('La venta debe ser aprobada por auditoría primero');
    }
    
    const selected = documents.filter(d => d.selected);
    if (selected.length === 0) {
      throw new Error('Debe seleccionar al menos un documento');
    }
    return true;
  }
};
```

---

*Última actualización: Febrero 2026 - Versión 2.0*
