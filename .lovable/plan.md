

## Diagnóstico

El campo `barrio` se envía en el INSERT a la tabla `beneficiaries`, pero esa columna **no existe** en la tabla. PostgREST rechaza la petición con un error de columna desconocida, lo que impide guardar el adherente. Como no se guarda, tampoco aparece en la lista ni se puede expandir la sección de documentos.

La tabla `clients` sí tiene `barrio`, pero `beneficiaries` no.

## Plan de cambios

### 1. Migración SQL: agregar columna `barrio` a `beneficiaries`

```sql
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS barrio character varying DEFAULT NULL;
```

Esto es todo lo que se necesita a nivel de base de datos. No se requieren cambios de RLS ni nuevas políticas.

### 2. Sin cambios de código

El componente `SaleAdherentsTab.tsx` y el hook `useCreateBeneficiary` ya envían `barrio` correctamente. Una vez que la columna exista en la tabla, el INSERT funcionará y los adherentes aparecerán en la lista con su botón "Documentos" expandible.

## Archivos a modificar

| Recurso | Cambio |
|---|---|
| Migración SQL | `ALTER TABLE beneficiaries ADD COLUMN barrio` |

