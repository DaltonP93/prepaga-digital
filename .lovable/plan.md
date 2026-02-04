
# Plan: Corrección de Templates, Mejora del Diseñador y Flujo de Ventas con Beneficiarios

## ✅ COMPLETADO

---

## Cambios Realizados

### 1. ✅ Migración de Base de Datos - Tabla beneficiaries
Se agregaron las columnas:
- `amount` (decimal 12,2) - Monto de cobertura
- `email` (varchar 255) - Email del beneficiario  
- `phone` (varchar 50) - Teléfono del beneficiario

### 2. ✅ Corrección del Hook useTemplates.ts
- Implementado patrón de fetch manual para evitar error de FK con `created_by`
- Ahora obtiene templates primero, luego consulta profiles por separado
- Combina los datos en el cliente

### 3. ✅ Mejoras en BeneficiariesManager.tsx
- Nueva columna "Monto" en la tabla con formato de moneda
- Nuevas columnas "Email" y "Teléfono"
- Indicador "Principal" junto al nombre
- Suma total de montos al final de la tabla
- Formato de moneda en pesos argentinos

### 4. ✅ Mejoras en DraggablePlaceholdersSidebar.tsx
Panel de variables de BD organizado por categorías:
- 👤 Cliente (nombre, apellido, email, DNI, etc.)
- 💳 Plan (nombre, precio, descripción, cobertura)
- 🏢 Empresa (nombre, email, teléfono, dirección)
- 🛒 Venta (fecha, total, vendedor, notas)
- 📅 Fechas (actual, vencimiento)
- 👥 Beneficiarios (lista, total montos)

---

## Archivos Modificados

| Archivo | Estado |
|---------|--------|
| `src/hooks/useTemplates.ts` | ✅ Fetch manual de profiles |
| `src/components/BeneficiariesManager.tsx` | ✅ UI mejorada con montos |
| `src/components/DraggablePlaceholdersSidebar.tsx` | ✅ Variables de BD por categorías |
| Base de datos `beneficiaries` | ✅ Migración ejecutada |

---

## Flujo de Pruebas

1. ✅ Lista de templates carga correctamente
2. Crear un nuevo template y confirmar que se guarda
3. Crear una venta y agregar beneficiarios con montos
4. Verificar que los montos se guardan y cargan correctamente
5. Probar el diseñador de templates insertando variables
