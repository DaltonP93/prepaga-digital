

# Fix: `whatsapp_provider` se sobreescribe con default al guardar

## Problema
En `AdminConfigPanel.tsx` línea 119, `||` trata strings vacíos como falsy, causando que el proveedor real de la DB se pierda al guardar otros campos. Lo mismo aplica a `email_provider` (línea 129).

## Cambio
En `src/components/AdminConfigPanel.tsx`, líneas 118-136, cambiar `||` por `??` en los campos enum (`whatsapp_provider`, `email_provider`) para preservar valores válidos de la DB:

```typescript
whatsapp_provider: apiConfig?.whatsapp_provider ?? defaultApiFormData.whatsapp_provider,
// ... otros campos siguen con ||, está bien para strings vacíos
email_provider: apiConfig?.email_provider ?? defaultApiFormData.email_provider,
```

Solo estos dos campos necesitan `??` porque son enums con valores que nunca deberían ser string vacío. Los demás campos (tokens, URLs, keys) usan `||` correctamente ya que un string vacío `''` equivale a "no configurado".

