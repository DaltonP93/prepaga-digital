# Manual de Usuario — Entrega A

Manual de usuario y casos de uso de las funcionalidades de **Entrega A** de SAMAP
Prepaga Digital: operaciones sobre contratos firmados (Incorporación de Adherente,
Cambio de Plan, Vigencia Inmediata), Plan Materno como adicional, titular persona
jurídica y el módulo de Generación de Comisiones.

## Contenido de la carpeta

| Archivo | Qué es |
|---|---|
| `manual.html` | Fuente del manual. HTML autocontenido, pensado para imprimir a PDF (A4, saltos de página por capítulo). Las imágenes se referencian con rutas relativas a `capturas/`. |
| `Manual-Entrega-A.pdf` | Export final del manual (24 páginas). Es el entregable. |
| `capturas/` | Capturas de pantalla numeradas por caso de uso, en `.jpg`. |
| `README.md` | Este archivo. |

## Esquema de nombres de `capturas/`

`NN-slug.jpg`, donde el rango de `NN` agrupa por capítulo:

| Rango | Capítulo |
|---|---|
| `00`, `10`–`15` | Venta / contrato normal (dashboard, ventas, formulario, auditoría, templates, flujo de firma) |
| `20`–`25` | Anexo de Incorporación de Adherente |
| `30`–`32` | Solicitud de Cambio de Plan |
| `40`–`42` | Vigencia Inmediata |
| `50`–`52` | Plan Materno como adicional |
| `60`–`62` | Titular persona jurídica (empresa) |
| `70`–`71` | Documentos generados |
| `80`–`89` | Generación de Comisiones (liquidación) |

Todas las capturas se tomaron con la app corriendo en local (`npm run dev`,
`http://localhost:8080`) apuntando a la **base de PRUEBA** (US test,
`ykducvvcjzdpoojxlsig`). No hay datos de producción.

## Regenerar el PDF

Después de editar `manual.html` o de cambiar capturas:

```bash
# Windows (PowerShell). Ajustar la ruta de chrome.exe si hace falta.
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless --disable-gpu --no-pdf-header-footer `
  --print-to-pdf="C:\Programacion\CNAM\SAMAP\sistema_ventas\prepaga-digital\docs\manual-entrega-a\Manual-Entrega-A.pdf" `
  "file:///C:/Programacion/CNAM/SAMAP/sistema_ventas/prepaga-digital/docs/manual-entrega-a/manual.html"
```

> El PDF se genera abriendo `manual.html` con `file://` (así Chrome resuelve
> `capturas/*.jpg` relativo al archivo). Servirlo por el dev server de Vite rompe
> las rutas de las imágenes porque el fallback SPA intercepta `/docs/...`.

## Actualizar una captura

1. Levantar la app en local contra US test y navegar a la pantalla.
2. Tomar la captura y guardarla en `capturas/` con el mismo nombre que la que
   reemplaza.
3. Regenerar el PDF con el comando de arriba.
