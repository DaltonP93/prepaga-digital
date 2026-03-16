
Problema real detectado: el error volvió porque el cuello de botella principal no es `file_uploads`, sino la subida al bucket privado `documents` con rutas incompatibles con la policy de storage.

Qué confirmé
- El bucket `documents` es privado y su policy exige que la ruta empiece con `company_id/`.
- Legacy 1.0 hoy sube a `template-images/...` en `useFileUpload.ts`, sin prefijo de empresa.
- V2/OpenSign hoy sube a `template-assets/{templateId}/...` en:
  - `TemplateDesigner2.tsx`
  - `OpenSignTemplateEditor.tsx`
  - fallback local de `BlockPropertyPanel.tsx`
- Además, V2 usa `getPublicUrl()` sobre un bucket privado, así que aunque subiera, la URL resultante no es la correcta para render estable.

Señales que lo prueban
- Console: `✅ File uploaded successfully: null` en Legacy. Eso cuadra con un upload fallido o URL no utilizable que el hook hoy no reporta bien.
- DB: `file_uploads` está vacío, así que la inserción ni siquiera llega de forma consistente.
- Policies:
  - `file_uploads`: INSERT permitido si `auth.uid() = uploaded_by`
  - `storage.objects` para `documents`: INSERT permitido solo si `storage.foldername(name)[1] = company_id del usuario`

Diagnóstico
```text
Error repetido = mismatch entre path de storage y policy del bucket
NO = falta de abrir el picker
NO = problema principal de file_uploads
```

Plan de corrección estructural
1. Centralizar la subida de imágenes en una sola rutina
- Crear una utilidad/hook compartido para imágenes de templates.
- Flujo único:
  - obtener usuario autenticado
  - obtener `company_id` desde `profiles`
  - validar MIME permitido
  - construir path correcto:
    `"{companyId}/template-images/{templateId-or-context}/{timestamp}-{file.name}"`
  - subir a `documents`
  - generar signed URL con `createSignedUrl`
  - devolver:
    - `storagePath`
    - `signedUrl`
    - `companyId`
    - metadata útil

2. Corregir Legacy 1.0
- `useFileUpload.ts` no debe subir a `template-images/...` a secas.
- Debe usar path con prefijo `company_id`.
- Debe dejar de “comerse” errores parciales:
  - si falla upload
  - si falla insert en `file_uploads`
  - si falla signed URL
  debe reportarlo explícitamente en consola/toast.
- `ImageManager.tsx` debe seguir usando `type="button"` como ya quedó, pero consumiendo la nueva rutina central.

3. Corregir V2 / OpenSign
- Reemplazar uploads directos en:
  - `TemplateDesigner2.tsx`
  - `OpenSignTemplateEditor.tsx`
  - `BlockPropertyPanel.tsx` fallback local
- Ninguno debe llamar más a:
  - `supabase.storage.from("documents").upload(path, file)` con path sin empresa
  - `getPublicUrl()` para imágenes privadas
- Todos deben usar la rutina central y persistir:
  - `content.src = signedUrl`
  - opcionalmente `content.asset_id` / `content.storage_path` si conviene mantener trazabilidad

4. Mantener el picker estable en V2
- La parte del input estable ya existe en:
  - `TemplateDesigner2.tsx`
  - `OpenSignTemplateEditor.tsx`
- No hay que retroceder eso.
- Solo hay que cambiar la rutina de subida para que el picker no cierre y además la carga funcione.

5. Eliminar lógica duplicada/conflictiva
- `BlockPropertyPanel.tsx` todavía conserva un fallback local de upload en `ImageProperties`.
- Lo dejaría solo para modo standalone si realmente se usa fuera del editor, pero apuntando a la rutina central.
- Objetivo: una sola forma de subir imagen en Legacy y V2.

6. Ajustar render de imágenes privadas
- Como `documents` es privado, no conviene depender de `getPublicUrl()`.
- Usar signed URL para render inmediato.
- Si el template necesita persistencia duradera, guardar también `storagePath` para regenerar signed URL al reabrir.

7. QA a ejecutar después del fix
- Legacy 1.0:
  - subir PNG/JPG/WebP
  - cancelar picker
  - archivo inválido
- V2/OpenSign:
  - elegir imagen desde props
  - reemplazar imagen
  - abrir picker varias veces
  - cerrar/reabrir editor y validar que la imagen siga resolviendo
- Verificación de storage:
  - confirmar que los objetos quedan en rutas tipo:
    `companyId/...`
- Verificación de DB:
  - confirmar si `file_uploads` se sigue usando; si sí, que inserte con datos consistentes

Archivos a tocar
- `src/hooks/useFileUpload.ts`
- `src/components/ImageManager.tsx`
- `src/components/designer2/TemplateDesigner2.tsx`
- `src/components/designer2/opensign/OpenSignTemplateEditor.tsx`
- `src/components/designer2/BlockPropertyPanel.tsx`
- posiblemente nueva utilidad compartida, por ejemplo:
  - `src/lib/templateImageUpload.ts`
  o
  - `src/hooks/useTemplateImageUpload.ts`

Detalles técnicos
```text
Storage policy actual para documents:
- requiere bucket_id = 'documents'
- requiere foldername(name)[1] = company_id del usuario

Rutas actuales incorrectas:
- template-images/...
- template-assets/{templateId}/...

Rutas esperadas:
- {companyId}/template-images/{templateId}/...
- {companyId}/template-assets/{templateId}/...
```

Resultado esperado del próximo fix
- Legacy: no cierra y además sube bien
- V2: no cierra y además sube bien
- desaparece el error repetido porque la ruta ya cumple RLS de storage
- la imagen renderiza con signed URL válida en bucket privado

<lov-actions>
<lov-suggestion message="Test the image upload flow end-to-end in Legacy and V2, including cancel, invalid file, and reopening the editor.">Verify that it works</lov-suggestion>
<lov-suggestion message="Implement a shared template image upload utility that uses company-scoped storage paths and signed URLs for all editors.">Unify image uploads</lov-suggestion>
<lov-suggestion message="Persist private asset storage paths and regenerate signed URLs when reopening V2 templates so images always render correctly.">Fix private asset persistence</lov-suggestion>
<lov-suggestion message="Update the V2 document insertion UI text to match backend support, for example PDF and images only if DOCX is not fully supported yet.">Align document UI text</lov-suggestion>
</lov-actions>
