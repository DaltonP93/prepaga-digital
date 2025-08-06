
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { user, loading, loadingStage, forceRefreshProfile } = useAuthContext();
  const location = useLocation();
  const [showTimeout, setShowTimeout] = useState(false);

  console.log('🔒 RequireAuth: Verificando acceso', { 
    user: !!user, 
    loading, 
    loadingStage,
    pathname: location.pathname 
  });

  // Timeout de seguridad para evitar carga infinita
  useEffect(() => {
    if (loadingStage === 'loading_profile') {
      const timeoutId = setTimeout(() => {
        console.log('⚠️ RequireAuth: Timeout en carga de perfil');
        setShowTimeout(true);
      }, 10000); // 10 segundos

      return () => clearTimeout(timeoutId);
    } else {
      setShowTimeout(false);
    }
  }, [loadingStage]);

  // Si hay timeout, mostrar opción de reintentar
  if (showTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Problema de carga</AlertTitle>
            <AlertDescription>
              La carga de tu perfil está tardando más de lo esperado. 
              Puedes intentar refrescar o cerrar sesión para comenzar de nuevo.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setShowTimeout(false);
                forceRefreshProfile();
              }}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/login'}
              className="flex-1"
            >
              Ir a Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras se inicializa la autenticación
  if (loading || loadingStage === 'initializing' || loadingStage === 'loading_profile') {
    console.log('⏳ RequireAuth: Mostrando loading...', { loading, loadingStage });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md mx-auto p-4">
          <div className="text-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              {loadingStage === 'initializing' ? 'Inicializando...' :
               loadingStage === 'loading_profile' ? 'Cargando perfil...' :
               'Cargando aplicación...'}
            </p>
          </div>
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-full mt-8" />
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    console.log('❌ RequireAuth: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay usuario, mostrar el contenido protegido
  console.log('✅ RequireAuth: Usuario autenticado, mostrando contenido protegido');
  return <>{children}</>;
};

export default RequireAuth;
