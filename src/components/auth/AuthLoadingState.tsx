
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface AuthLoadingStateProps {
  stage: 'initializing' | 'loading_profile' | 'retrying' | 'error' | 'ready';
  progress?: number;
  retryCount?: number;
  maxRetries?: number;
  isConnected?: boolean;
  onRetry?: () => void;
  onForceRefresh?: () => void;
  onSignOut?: () => void;
  message?: string;
}

export const AuthLoadingState: React.FC<AuthLoadingStateProps> = ({
  stage,
  progress = 0,
  retryCount = 0,
  maxRetries = 3,
  isConnected = true,
  onRetry,
  onForceRefresh,
  onSignOut,
  message
}) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'initializing':
        return {
          title: 'Inicializando...',
          description: 'Configurando tu sesión',
          showProgress: true
        };
      case 'loading_profile':
        return {
          title: 'Cargando perfil...',
          description: 'Obteniendo tu información de usuario',
          showProgress: true
        };
      case 'retrying':
        return {
          title: `Reintentando (${retryCount}/${maxRetries})...`,
          description: 'Intentando cargar tu perfil nuevamente',
          showProgress: true
        };
      case 'error':
        return {
          title: 'Error de conexión',
          description: message || 'No se pudo cargar tu perfil',
          showProgress: false
        };
      case 'ready':
        return {
          title: 'Listo',
          description: 'Sistema preparado',
          showProgress: false
        };
      default:
        return {
          title: 'Cargando...',
          description: 'Un momento por favor',
          showProgress: true
        };
    }
  };

  const { title, description, showProgress } = getStageInfo();

  // Don't render anything for ready state
  if (stage === 'ready') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            {stage === 'error' ? (
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                {isConnected ? (
                  <RefreshCw className="h-6 w-6 text-destructive" />
                ) : (
                  <WifiOff className="h-6 w-6 text-destructive" />
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                {!isConnected && (
                  <WifiOff className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {!isConnected && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                <span>Sin conexión</span>
              </div>
            )}
          </div>
          
          <CardDescription>{description}</CardDescription>
          
          {showProgress && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="w-full" />
              {progress > 0 && (
                <p className="text-xs text-muted-foreground">{progress}% completado</p>
              )}
            </div>
          )}
        </CardHeader>

        {stage === 'error' && (
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              {onRetry && (
                <Button 
                  onClick={onRetry}
                  disabled={!isConnected}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              )}
              
              {onForceRefresh && (
                <Button 
                  variant="outline" 
                  onClick={onForceRefresh}
                  disabled={!isConnected}
                  className="w-full"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Forzar Actualización
                </Button>
              )}
              
              {onSignOut && (
                <Button 
                  variant="destructive" 
                  onClick={onSignOut}
                  className="w-full"
                >
                  Cerrar Sesión
                </Button>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground text-center space-y-1 pt-4 border-t">
              <p><strong>Sugerencias:</strong></p>
              <ul className="text-left space-y-1">
                <li>• Verifica tu conexión a internet</li>
                <li>• Refresca la página (F5)</li>
                <li>• Intenta cerrar sesión y volver a iniciar</li>
                {!isConnected && <li>• Espera a que se restablezca la conexión</li>}
              </ul>
            </div>
          </CardContent>
        )}
        
        {stage === 'retrying' && retryCount > 0 && (
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              <p>Intento {retryCount} de {maxRetries}</p>
              <div className="mt-2 flex justify-center">
                <div className="flex space-x-1">
                  {Array.from({ length: maxRetries }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        i < retryCount ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
