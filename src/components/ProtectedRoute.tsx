
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertCircle, LogOut } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading, refreshProfile, forceRefreshProfile, signOut } = useAuth();
  const location = useLocation();
  const [showProfileError, setShowProfileError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const MAX_RETRIES = 3;
  const PROFILE_TIMEOUT = 8000; // 8 seconds timeout

  // Handle profile loading timeout and retries
  useEffect(() => {
    if (!user) return;

    if (loading && !profile) {
      // Start timeout timer
      const timeoutId = setTimeout(() => {
        if (loading && !profile && retryCount < MAX_RETRIES) {
          console.log(`Profile loading timeout, retry ${retryCount + 1}/${MAX_RETRIES}`);
          setRetryCount(prev => prev + 1);
          setIsRetrying(true);
          
          // Try to refresh profile
          refreshProfile().finally(() => {
            setIsRetrying(false);
          });
        } else if (!profile && retryCount >= MAX_RETRIES) {
          console.log('Max retries reached, showing profile error');
          setShowProfileError(true);
        }
      }, PROFILE_TIMEOUT);

      return () => clearTimeout(timeoutId);
    }

    // Reset states when profile is loaded
    if (profile) {
      setShowProfileError(false);
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [user, loading, profile, retryCount, refreshProfile]);

  // Reset retry state when user changes
  useEffect(() => {
    setRetryCount(0);
    setShowProfileError(false);
    setIsRetrying(false);
  }, [user?.id]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading while authenticating or loading profile (with timeout)
  if (loading || (!profile && !showProfileError && retryCount < MAX_RETRIES)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <CardTitle>
              {isRetrying ? `Reintentando (${retryCount}/${MAX_RETRIES})...` : 'Cargando...'}
            </CardTitle>
            <CardDescription>
              {isRetrying 
                ? 'Intentando cargar tu perfil nuevamente'
                : 'Verificando tu información de usuario'
              }
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show profile error with recovery options
  if (showProfileError || (!profile && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Error de Perfil</CardTitle>
            <CardDescription>
              No se pudo cargar tu perfil de usuario. Esto puede deberse a problemas de conexión o configuración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button 
                onClick={async () => {
                  setIsRetrying(true);
                  setShowProfileError(false);
                  setRetryCount(0);
                  try {
                    await refreshProfile();
                  } finally {
                    setIsRetrying(false);
                  }
                }}
                disabled={isRetrying}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Reintentando...' : 'Reintentar'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={async () => {
                  setIsRetrying(true);
                  try {
                    await forceRefreshProfile();
                  } finally {
                    setIsRetrying(false);
                  }
                }}
                disabled={isRetrying}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                Forzar Actualización
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={signOut}
                disabled={isRetrying}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Si el problema persiste:</p>
              <ul className="text-left space-y-1">
                <li>• Verifica tu conexión a internet</li>
                <li>• Intenta cerrar sesión y volver a iniciar</li>
                <li>• Contacta al administrador del sistema</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role permissions
  if (requiredRole && requiredRole.length > 0) {
    if (!profile.role || !requiredRole.includes(profile.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <CardTitle>Acceso Restringido</CardTitle>
              <CardDescription>
                No tienes los permisos necesarios para acceder a esta sección.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.history.back()} className="w-full">
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
