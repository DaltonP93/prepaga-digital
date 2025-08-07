
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { 
    user, 
    profile, 
    loading, 
    loadingStage
  } = useAuth();
  
  const { updateActivity } = useSessionManager(5, 30);
  const location = useLocation();

  // Update activity when user interacts with protected routes
  useEffect(() => {
    if (user) {
      updateActivity();
    }
  }, [user, updateActivity, location.pathname]);

  console.log('🛡️ ProtectedRoute: Estado actual -', { 
    user: !!user, 
    loading, 
    loadingStage,
    hasProfile: !!profile,
    pathname: location.pathname
  });

  // Show loading during initial auth check and profile loading
  if (loading && (loadingStage === 'initializing' || loadingStage === 'loading_profile')) {
    console.log('🛡️ ProtectedRoute: Mostrando loading inicial');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando aplicación...</p>
          <p className="text-xs text-muted-foreground mt-1">
            {loadingStage === 'loading_profile' ? 'Cargando perfil...' : 'Inicializando...'}
          </p>
        </div>
      </div>
    );
  }

  // If loading stage is error, redirect to login
  if (loadingStage === 'error') {
    console.log('🛡️ ProtectedRoute: Error en carga, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('🛡️ ProtectedRoute: No hay usuario, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions if required and profile exists
  if (requiredRole && requiredRole.length > 0 && profile && profile.role) {
    if (!requiredRole.includes(profile.role)) {
      console.log('🛡️ ProtectedRoute: Rol no autorizado');
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      );
    }
  }

  // Allow access - user is authenticated
  console.log('✅ ProtectedRoute: Acceso permitido, renderizando children');
  return <>{children}</>;
};
