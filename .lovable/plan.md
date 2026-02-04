
# Plan: Corrección de Templates, Mejora del Diseñador y Flujo de Ventas con Beneficiarios

## Resumen del Problema

Se identificaron los siguientes problemas:

1. **Templates no cargan**: Error de relación entre `templates` y `created_by` (no existe FK en la BD)
2. **Beneficiarios incompletos**: La tabla `beneficiaries` no tiene columnas para `amount`, `email`, `phone` que el componente intenta usar
3. **Diseñador de templates básico**: Necesita mejoras para usar datos de la BD de forma más intuitiva
4. **Flujo de ventas incompleto**: Falta integrar mejor la gestión de adherentes con montos editables

---

## Cambios Propuestos

### 1. Corrección del Hook useTemplates.ts

**Problema**: La consulta usa `creator:created_by(first_name, last_name)` pero no existe FK.

**Solución**: Aplicar el patrón de fetch manual (como en useSales):

```text
Paso 1: Obtener templates sin la relación
Paso 2: Extraer IDs únicos de created_by
Paso 3: Consultar profiles por separado
Paso 4: Combinar los datos
```

### 2. Migración de Base de Datos - Tabla beneficiaries

Agregar columnas faltantes:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `amount` | `decimal(12,2)` | Monto de cobertura del beneficiario |
| `email` | `varchar(255)` | Email del beneficiario |
| `phone` | `varchar(50)` | Teléfono del beneficiario |

### 3. Mejoras en el Componente BeneficiariesManager

- Mostrar columna de "Monto" en la tabla
- Permitir edición inline del monto
- Validación de datos antes de guardar
- Formato de moneda para el monto

### 4. Mejoras en el Template Designer

Agregar panel de variables de base de datos organizado por categorías:

```text
Categorías:
├── Cliente (nombre, apellido, email, DNI, etc.)
├── Plan (nombre, precio, descripción, cobertura)
├── Empresa (nombre, email, teléfono, dirección)
├── Venta (fecha, total, vendedor, notas)
├── Beneficiarios (lista dinámica)
└── Fechas (actual, vencimiento)
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useTemplates.ts` | Fetch manual de profiles para evitar error de FK |
| `src/hooks/useBeneficiaries.ts` | Actualizar tipos para incluir nuevas columnas |
| `src/components/BeneficiariesManager.tsx` | Mejorar UI con monto editable |
| `src/integrations/supabase/types.ts` | Se actualizará automáticamente con la migración |

---

## Detalles Técnicos

### Migración SQL

```sql
-- Agregar columnas a beneficiaries
ALTER TABLE beneficiaries 
ADD COLUMN IF NOT EXISTS amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS email varchar(255),
ADD COLUMN IF NOT EXISTS phone varchar(50);
```

### Corrección useTemplates.ts

```typescript
// Cambio de query con join directo a fetch manual
const { data: templatesData, error } = await supabase
  .from('templates')
  .select(`*, company:company_id(name), template_questions(id)`)
  .order('created_at', { ascending: false });

// Fetch de creators por separado
const creatorIds = [...new Set(templatesData?.map(t => t.created_by).filter(Boolean))];
const { data: creators } = await supabase
  .from('profiles')
  .select('id, first_name, last_name')
  .in('id', creatorIds);

// Combinar datos
const templatesWithCreators = templatesData?.map(template => ({
  ...template,
  creator: creators?.find(c => c.id === template.created_by) || null
}));
```

### Mejora BeneficiariesManager

- Agregar columna "Monto" en la tabla
- Input numérico con formato de moneda
- Cálculo de suma total de montos de beneficiarios
- Badge con estado "Principal" / "Secundario"

---

## Flujo de Pruebas Recomendado

1. Verificar que la lista de templates carga correctamente
2. Crear un nuevo template y confirmar que se guarda
3. Crear una venta y agregar beneficiarios con montos
4. Verificar que los montos se guardan y cargan correctamente
5. Probar el diseñador de templates insertando variables
