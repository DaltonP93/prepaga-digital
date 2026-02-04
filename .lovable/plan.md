
# Plan: Corrección del Estado de Carga de Autenticación

## Problema Identificado

El sistema se queda mostrando "Verificando autenticación..." cuando se navega entre páginas o se cargan templates. Esto ocurre por los siguientes conflictos:

### Causas Raíz

1. **Doble verificación de `loading`**:
   - `SimpleProtectedRoute` muestra spinner cuando `loading` es true
   - `Layout` también muestra spinner cuando `loading` es true
   - Esto crea una cascada de verificaciones que puede bloquear la UI

2. **Múltiples listeners de auth state**:
   - `SimpleAuthProvider` tiene un listener de `onAuthStateChange`
   - `useSessionManager` (usado en `ProtectedRoute`) tiene otro listener
   - Esto puede causar estados inconsistentes

3. **`Layout` component bloquea innecesariamente**:
   - El componente `Layout` verifica `loading` y muestra spinner
   - Esto es redundante porque `SimpleProtectedRoute` ya verifica la autenticación

---

## Solución Propuesta

### Cambio 1: Eliminar verificación de loading en Layout

El `Layout` component no debe verificar el estado de loading porque:
- Ya está dentro de una ruta protegida (`SimpleProtectedRoute`)
- Si llegamos al `Layout`, ya pasamos la verificación de auth

```text
Archivo: src/components/Layout.tsx

Antes:
- Verifica loading del auth context
- Muestra spinner si loading es true

Después:
- Renderiza directamente el contenido
- No verifica loading (ya lo hace SimpleProtectedRoute)
```

### Cambio 2: Simplificar SimpleProtectedRoute

Mejorar la lógica para evitar re-renders innecesarios:

```text
Archivo: src/components/SimpleProtectedRoute.tsx

Mejoras:
- Usar useMemo para evitar re-cálculos
- Optimizar el timeout para casos edge
- Mejor logging para debugging
```

### Cambio 3: Eliminar uso de useSessionManager en ProtectedRoute

El `ProtectedRoute` usa `useSessionManager` que añade otro listener de auth. Dado que el proyecto usa `SimpleProtectedRoute`, el `ProtectedRoute` con `useSessionManager` no debería ser necesario.

```text
Archivo: src/components/ProtectedRoute.tsx

Cambio:
- Eliminar useSessionManager
- Simplificar el componente para evitar conflictos
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/Layout.tsx` | Eliminar verificación de loading |
| `src/components/SimpleProtectedRoute.tsx` | Optimizar lógica de loading |
| `src/components/ProtectedRoute.tsx` | Eliminar useSessionManager |

---

## Detalles Técnicos

### Layout.tsx - Antes y Después

```typescript
// ANTES (problemático)
export function Layout({ children, title, description }: LayoutProps) {
  const { profile, loading } = useSimpleAuthContext();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  // ...
}

// DESPUÉS (corregido)
export function Layout({ children, title, description }: LayoutProps) {
  // No verificar loading - SimpleProtectedRoute ya lo maneja
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
```

### ProtectedRoute.tsx - Simplificación

```typescript
// Eliminar useSessionManager para evitar conflictos
// El componente solo debe verificar auth y roles
export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useSimpleAuthContext();
  // No usar useSessionManager aquí
  // ...
};
```

---

## Flujo Esperado Después de los Cambios

```text
Usuario navega a /templates
       ↓
SimpleProtectedRoute verifica auth (única vez)
       ↓
Si autenticado → renderiza MainLayout
       ↓
MainLayout renderiza Outlet (Templates)
       ↓
Templates usa Layout (sin verificar loading)
       ↓
Templates carga y muestra contenido
```

---

## Pruebas Recomendadas

1. Navegar a `/templates` y verificar que carga sin quedarse en "Verificando autenticación"
2. Crear un nuevo template y verificar que el formulario funciona
3. Editar un template existente
4. Navegar entre diferentes páginas (Sales, Documents, etc.)
5. Refrescar la página y verificar que se recupera la sesión correctamente
