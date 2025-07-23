
import { Navigate, useLocation } from "react-router-dom";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export const SimpleProtectedRoute = ({ children }: SimpleProtectedRouteProps) => {
  const { user, loading } = useSimpleAuthContext();
  const location = useLocation();

  console.log('🛡️ SimpleProtectedRoute:', { 
    user: !!user, 
    loading,
    pathname: location.pathname,
    email: user?.email 
  });

  // Mostrar loading solo si realmente está cargando
  if (loading) {
    console.log('🛡️ SimpleProtectedRoute: Mostrando loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    console.log('🛡️ SimpleProtectedRoute: No hay usuario, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuario autenticado, permitir acceso
  console.log('✅ SimpleProtectedRoute: Acceso permitido');
  return <>{children}</>;
};
