
import { Navigate, useLocation } from "react-router-dom";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

interface RequireAuthProps {
  children: React.ReactNode;
}

function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useSimpleAuthContext();
  const location = useLocation();

  console.log('🛡️ RequireAuth:', { 
    user: !!user, 
    loading,
    pathname: location.pathname,
    email: user?.email 
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🛡️ RequireAuth: No hay usuario, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ RequireAuth: Acceso permitido');
  return <>{children}</>;
}

export default RequireAuth;
