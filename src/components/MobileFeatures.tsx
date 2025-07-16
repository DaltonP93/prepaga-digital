import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/useMobile';
import { useOffline } from '@/hooks/useOffline';
import { 
  Camera, 
  Share2, 
  Vibrate, 
  MapPin, 
  Wifi, 
  WifiOff,
  Smartphone,
  Network,
  Battery,
  Signal
} from 'lucide-react';

export default function MobileFeatures() {
  const { 
    isMobile, 
    deviceInfo, 
    networkStatus, 
    takePhoto, 
    shareContent, 
    vibrate, 
    getCurrentPosition 
  } = useMobile();
  const { isOnline, offlineData } = useOffline();
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const photoUrl = await takePhoto();
      toast({
        title: "Foto tomada",
        description: "La foto se ha guardado correctamente",
      });
      console.log('Photo URL:', photoUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo tomar la foto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      await shareContent(
        'Prepaga Digital',
        'Mira esta increíble aplicación de gestión de seguros',
        window.location.href
      );
      toast({
        title: "Contenido compartido",
        description: "El contenido se ha compartido correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo compartir el contenido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVibrate = async () => {
    try {
      await vibrate();
      toast({
        title: "Vibración activada",
        description: "El dispositivo ha vibrado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo activar la vibración",
        variant: "destructive",
      });
    }
  };

  const handleGetLocation = async () => {
    try {
      setLoading(true);
      const position = await getCurrentPosition();
      toast({
        title: "Ubicación obtenida",
        description: `Lat: ${position.latitude.toFixed(4)}, Lng: ${position.longitude.toFixed(4)}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo obtener la ubicación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Funciones Móviles</h1>
        <p className="text-muted-foreground">
          Gestiona las funciones específicas para dispositivos móviles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Estado del dispositivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Estado del Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Entorno móvil</span>
              <Badge variant={isMobile ? "default" : "secondary"}>
                {isMobile ? "Móvil" : "Web"}
              </Badge>
            </div>
            
            {deviceInfo && (
              <>
                <div className="flex items-center justify-between">
                  <span>Plataforma</span>
                  <Badge variant="outline">{deviceInfo.platform}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Modelo</span>
                  <span className="text-sm text-muted-foreground">
                    {deviceInfo.model || 'No disponible'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Versión OS</span>
                  <span className="text-sm text-muted-foreground">
                    {deviceInfo.osVersion || 'No disponible'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Estado de la red */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Estado de la Red
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                Conexión
              </span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
            
            {networkStatus && (
              <>
                <div className="flex items-center justify-between">
                  <span>Tipo de conexión</span>
                  <Badge variant="outline">{networkStatus.connectionType}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Datos guardados offline</span>
                  <span className="text-sm text-muted-foreground">
                    {offlineData.clients.length + offlineData.sales.length} registros
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Funciones de cámara */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Cámara
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Funciones relacionadas con la cámara del dispositivo
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleTakePhoto} 
                disabled={loading || !isMobile}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
            </div>
            {!isMobile && (
              <p className="text-xs text-muted-foreground">
                Esta función solo está disponible en dispositivos móviles
              </p>
            )}
          </CardContent>
        </Card>

        {/* Funciones de compartir */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Compartir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comparte contenido usando las funciones nativas del dispositivo
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleShare} 
                disabled={loading}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartir App
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Funciones hápticas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vibrate className="h-5 w-5" />
              Retroalimentación Háptica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Proporciona retroalimentación táctil al usuario
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleVibrate} 
                disabled={!isMobile}
                className="flex-1"
              >
                <Vibrate className="h-4 w-4 mr-2" />
                Vibrar
              </Button>
            </div>
            {!isMobile && (
              <p className="text-xs text-muted-foreground">
                Esta función solo está disponible en dispositivos móviles
              </p>
            )}
          </CardContent>
        </Card>

        {/* Geolocalización */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geolocalización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Obtén la ubicación actual del usuario
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleGetLocation} 
                disabled={loading}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Obtener Ubicación
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Desarrollo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Para probar en dispositivo físico:</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Exporta el proyecto a GitHub</li>
                <li>2. Ejecuta <code className="bg-muted px-1 rounded">npm install</code></li>
                <li>3. Agrega plataforma: <code className="bg-muted px-1 rounded">npx cap add android</code></li>
                <li>4. Construye: <code className="bg-muted px-1 rounded">npm run build</code></li>
                <li>5. Sincroniza: <code className="bg-muted px-1 rounded">npx cap sync</code></li>
                <li>6. Ejecuta: <code className="bg-muted px-1 rounded">npx cap run android</code></li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">Funciones disponibles:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Cámara</Badge>
                <Badge variant="outline">Compartir</Badge>
                <Badge variant="outline">Vibración</Badge>
                <Badge variant="outline">Geolocalización</Badge>
                <Badge variant="outline">Notificaciones</Badge>
                <Badge variant="outline">Modo offline</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}