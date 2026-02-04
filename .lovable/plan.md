
# Plan: Corrección del Estado de Carga de Autenticación

## ✅ COMPLETADO

Se eliminaron las verificaciones redundantes de `loading` que causaban bloqueos:

1. **Layout.tsx** - Eliminada verificación de loading (redundante con SimpleProtectedRoute)
2. **MainLayout.tsx** - Eliminada verificación de loading (redundante con SimpleProtectedRoute)
3. **ProtectedRoute.tsx** - Eliminado useSessionManager (evita conflictos de listeners)
4. **SimpleProtectedRoute.tsx** - Optimizado con useMemo y timeout reducido a 5s

### Flujo corregido:
```
SimpleProtectedRoute verifica auth (única vez) → MainLayout/Layout renderizan sin bloqueo → Contenido carga
```
