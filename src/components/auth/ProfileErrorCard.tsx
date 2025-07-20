
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ProfileErrorCardProps {
  retryCount: number;
  maxRetries: number;
  isConnected: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  onForceRefresh: () => void;
  onSignOut: () => void;
}

export const ProfileErrorCard = ({
  retryCount,
  maxRetries,
  isConnected,
  isRetrying,
  onRetry,
  onForceRefresh,
  onSignOut
}: ProfileErrorCardProps) => {
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
              onClick={onRetry}
              disabled={isRetrying || !isConnected}
              className="w-full"
            >
              {isRetrying ? 'Reintentando...' : 'Reintentar Carga'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onForceRefresh}
              disabled={isRetrying || !isConnected}
              className="w-full"
            >
              Actualización Completa
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={onSignOut}
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
                  <li>• Intentos automáticos: {retryCount}/{maxRetries}</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
