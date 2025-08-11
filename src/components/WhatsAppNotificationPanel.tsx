
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSendWhatsAppNotification, useWhatsAppNotifications } from '@/hooks/useWhatsAppNotifications';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface WhatsAppNotificationPanelProps {
  saleId: string;
  clientPhone?: string;
  clientName?: string;
}

const WhatsAppNotificationPanel = ({ saleId, clientPhone = '', clientName = '' }: WhatsAppNotificationPanelProps) => {
  const [phone, setPhone] = useState(clientPhone);
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'signature' | 'questionnaire' | 'general'>('signature');

  const sendNotification = useSendWhatsAppNotification();
  const { data: notifications, isLoading } = useWhatsAppNotifications(saleId);

  const predefinedMessages = {
    signature: `Hola ${clientName}, tu contrato está listo para firma. Haz clic en el enlace para completar el proceso: `,
    questionnaire: `Hola ${clientName}, necesitamos que completes un breve cuestionario antes de proceder. Accede aquí: `,
    general: `Hola ${clientName}, tienes una actualización importante sobre tu proceso. Revisa aquí: `
  };

  const handleSendNotification = () => {
    if (!phone || !message) return;

    sendNotification.mutate({
      saleId,
      recipientPhone: phone,
      messageContent: message,
      notificationType
    });

    setMessage('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'read': return <Eye className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'sent': return 'outline';
      case 'delivered': return 'default';
      case 'read': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enviar nueva notificación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enviar Notificación WhatsApp
          </CardTitle>
          <CardDescription>
            Envía enlaces de firma o cuestionarios directamente al cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono del Cliente</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+34 123 456 789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Notificación</Label>
              <Select value={notificationType} onValueChange={(value: any) => setNotificationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signature">Enlace de Firma</SelectItem>
                  <SelectItem value="questionnaire">Cuestionario</SelectItem>
                  <SelectItem value="general">Mensaje General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              placeholder="Escribe tu mensaje aquí..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage(predefinedMessages[notificationType])}
              >
                Usar mensaje predefinido
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSendNotification}
            disabled={!phone || !message || sendNotification.isPending}
            className="w-full"
          >
            {sendNotification.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Notificación
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Historial de notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Notificaciones</CardTitle>
          <CardDescription>
            Seguimiento de todas las notificaciones enviadas para esta venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Cargando notificaciones...</p>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start space-x-3 p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(notification.status)}
                        <Badge variant={getStatusColor(notification.status) as any}>
                          {notification.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.sent_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium">Para: {notification.recipient_phone}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message_content.substring(0, 100)}
                      {notification.message_content.length > 100 ? '...' : ''}
                    </p>

                    <div className="flex gap-2 mt-2">
                      {notification.opened_at && (
                        <span className="text-xs text-green-600">
                          Abierto: {new Date(notification.opened_at).toLocaleString()}
                        </span>
                      )}
                      {notification.signed_at && (
                        <span className="text-xs text-blue-600">
                          Firmado: {new Date(notification.signed_at).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="mt-2">
                          Ver detalles
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Detalles de la Notificación</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium">URL de seguimiento:</p>
                            <code className="text-xs bg-muted p-2 rounded block">
                              {notification.notification_url}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Mensaje completo:</p>
                            <p className="text-sm bg-muted p-2 rounded">
                              {notification.message_content}
                            </p>
                          </div>
                          {notification.api_response && (
                            <div>
                              <p className="text-sm font-medium">Respuesta de la API:</p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                {JSON.stringify(notification.api_response, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No se han enviado notificaciones para esta venta.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppNotificationPanel;
