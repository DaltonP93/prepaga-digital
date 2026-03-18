

# Plan: Quitar campo Precio del formulario de Plan + Fix firma Contratada

## Problema 1: Campo "Precio (Gs.)" en Crear Plan
El formulario de Plan muestra un campo de precio que no se usa. Hay que eliminarlo del formulario.

**Archivo:** `src/components/PlanForm.tsx`
- Eliminar el bloque del campo `price` (líneas 131-145)
- Eliminar `price` del `defaultValues`, del `reset()`, y del `onSubmit`
- Eliminar la validación de `price` en el tipo `PlanFormData`

## Problema 2: Firma Contratada muestra datos incorrectos

**Causa raíz:** La tabla `company_settings` tiene RLS que solo permite acceso a `admin`/`super_admin` autenticados. El flujo de firma pública usa `signatureClient` con header `x-signature-token` (rol anon), por lo que la query a `company_settings` devuelve `null`. El fallback usa `companyInfo?.name` ("Prepaga Digital") en vez del nombre del representante configurado ("Eder Arguello"), y el CI queda vacío.

**Fix:** Agregar una política RLS SELECT en `company_settings` para acceso por signature token, similar a las políticas existentes en `companies`, `plans`, etc.

**Archivo:** Nueva migración SQL
```sql
CREATE POLICY "Public can read company_settings via signature token"
ON public.company_settings
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.sales
    WHERE id = public.get_sale_id_from_signature_token()
  )
);
```

Esto permite que el flujo público de firma lea `contratada_signer_name` y `contratada_signer_dni` correctamente. Los datos sensibles como SMTP ya están en otra tabla (`company_otp_policy`), así que `company_settings` es seguro de exponer en lectura.

**Nota de seguridad:** La política solo expone las filas de la empresa vinculada a la venta del token activo, no todas las empresas.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/PlanForm.tsx` | Eliminar campo price |
| Nueva migración SQL | RLS policy para company_settings con signature token |

