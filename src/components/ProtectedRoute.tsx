
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { AuthLoadingState } from "@/components/auth/AuthLoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { 
    user, 
    profile, 
    loading, 
    refreshProfile, 
    forceRefreshProfile, 
    signOut,
    connectionStatus,
    loadingStage,
    loadingProgress
  } = useAuth();
  
  const { session, isConnected, updateActivity } = useSessionManager(5, 30);
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const MAX_RETRIES = 3;

  // Update activity when user interacts with protected routes
  useEffect(() => {
    if (user) {
      updateActivity();
    }
  }, [user, updateActivity, location.pathname]);

  // Handle automatic retries for profile loading
  useEffect(() => {
    if (loadingStage === 'error' && retryCount < MAX_RETRIES && user && !isRetrying) {
      const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
      
      const timeoutId = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
        setRetryCount(prev => prev + 1);
        setIsRetrying(true);
        
        refreshProfile().finally(() => {
          setIsRetrying(false);
        });
      }, retryDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [loadingStage, retryCount, user, isRetrying, refreshProfile]);

  // Reset retry count when user changes or profile loads successfully
  useEffect(() => {
    if (profile || !user) {
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [profile, user?.id]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show enhanced loading states
  if (loading || (loadingStage !== 'ready' && loadingStage !== 'error')) {
    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        await refreshProfile();
      } finally {
        setIsRetrying(false);
      }
    };

    const handleForceRefresh = async () => {
      setIsRetrying(true);
      try {
        await forceRefreshProfile();
      } finally {
        setIsRetrying(false);
      }
    };

    return (
      <AuthLoadingState
        stage={isRetrying ? 'retrying' : loadingStage}
        progress={loadingProgress}
        retryCount={retryCount}
        maxRetries={MAX_RETRIES}
        isConnected={isConnected && connectionStatus === 'connected'}
        onRetry={handleRetry}
        onForceRefresh={handleForceRefresh}
        onSignOut={signOut}
        message={connectionStatus === 'disconnected' ? 'Sin conexión a internet' : undefined}
      />
    );
  }

  // Show profile error with enhanced recovery options
  if (!profile && !loading && loadingStage !== 'loading_profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Error de Perfil</CardTitle>
            <CardDescription>
              No se pudo cargar tu perfil de usuario. Esto puede deberse a problemas de conexión, configuración o datos faltantes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button 
                onClick={async () => {
                  setIsRetrying(true);
                  try {
                    await refreshProfile();
                  } finally {
                    setIsRetrying(false);
                  }
                }}
                disabled={isRetrying || !isConnected}
                className="w-full"
              >
                {isRetrying ? 'Reintentando...' : 'Reintentar Carga'}
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
                disabled={isRetrying || !isConnected}
                className="w-full"
              >
                Actualización Completa
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={signOut}
                disabled={isRetrying}
                className="w-full"
              >
                Cerrar Sesión
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span>Estado de conexión:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isConnected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              
              <div className="text-left">
                <p className="font-medium mb-1">Pasos de resolución:</p>
                <ul className="space-y-1 text-xs">
                  <li>1. Verifica tu conexión a internet</li>
                  <li>2. Intenta "Actualización Completa"</li>
                  <li>3. Refresca la página (F5)</li>
                  <li>4. Cierra sesión y vuelve a iniciar</li>
                  {retryCount > 0 && (
                    <li>• Intentos automáticos: {retryCount}/{MAX_RETRIES}</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role permissions with enhanced error handling
  if (requiredRole && requiredRole.length > 0 && profile) {
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
                Tu rol actual ({profile.role}) no tiene permisos para acceder a esta sección.
                Roles requeridos: {requiredRole.join(', ')}.
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
