
import { useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const NotificationSettings = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [signatureNotifications, setSignatureNotifications] = useState(true);
  const [documentNotifications, setDocumentNotifications] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handlePushToggle = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Notificaciones
          </CardTitle>
          <CardDescription>
            Configura cómo y cuándo quieres recibir notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notificaciones Push */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  Notificaciones Push
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recibe notificaciones inmediatas en tu navegador
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isSupported && (
                  <Badge variant="secondary">No soportado</Badge>
                )}
                {isSupported && (
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={isLoading || !isSupported}
                  />
                )}
              </div>
            </div>
            
            {isSubscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestNotification}
                className="ml-6"
              >
                Enviar notificación de prueba
              </Button>
            )}
          </div>

          <Separator />

          {/* Configuración de tipos de notificaciones */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Tipos de Notificaciones</Label>
            
            <div className="space-y-3 ml-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="signature-notifications">Firmas de documentos</Label>
                  <p className="text-xs text-muted-foreground">
                    Cuando se complete o expire una firma
                  </p>
                </div>
                <Switch
                  id="signature-notifications"
                  checked={signatureNotifications}
                  onCheckedChange={setSignatureNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="document-notifications">Nuevos documentos</Label>
                  <p className="text-xs text-muted-foreground">
                    Cuando se generen nuevos documentos
                  </p>
                </div>
                <Switch
                  id="document-notifications"
                  checked={documentNotifications}
                  onCheckedChange={setDocumentNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reminder-notifications">Recordatorios</Label>
                  <p className="text-xs text-muted-foreground">
                    Recordatorios de firmas pendientes
                  </p>
                </div>
                <Switch
                  id="reminder-notifications"
                  checked={reminderNotifications}
                  onCheckedChange={setReminderNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="email-notifications">Notificaciones por email</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibir también notificaciones por correo
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de sonido */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Sonido de notificaciones
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reproducir sonido al recibir notificaciones
                </p>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
