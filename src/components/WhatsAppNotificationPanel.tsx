import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useSendWhatsAppNotification,
  useWhatsAppNotifications,
} from "@/hooks/useWhatsAppNotifications";
import { useCompanyApiConfiguration } from "@/hooks/useCompanyApiConfiguration";
import { getSignatureLinkUrl } from "@/lib/appUrls";
import { MessageSquare, Send, Clock, CheckCircle, XCircle, Eye, Link2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

interface WhatsAppNotificationPanelProps {
  saleId: string;
  clientPhone?: string;
  clientName?: string;
  companyName?: string;
  signatureUrl?: string;
  signatureExpiration?: string;
}

const WhatsAppNotificationPanel = ({
  saleId,
  clientPhone = "",
  clientName = "",
  companyName = "",
  signatureUrl: propSignatureUrl,
  signatureExpiration: propSignatureExpiration,
}: WhatsAppNotificationPanelProps) => {
  const [phone, setPhone] = useState(clientPhone);
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "signature" | "questionnaire" | "general"
  >("signature");
  const { profile } = useSimpleAuthContext();

  const sendNotification = useSendWhatsAppNotification();
  const { data: notifications, isLoading } = useWhatsAppNotifications(saleId);
  const { configuration: apiConfig } = useCompanyApiConfiguration();

  const currentProvider = apiConfig?.whatsapp_provider || "wame_fallback";
  const providerLabels: Record<string, string> = {
    meta: "Meta API",
    twilio: "Twilio",
    wame_fallback: "wa.me Manual",
  };
  const isManualMode = currentProvider === "wame_fallback";

  // Fetch active signature links for auto-URL inclusion
  const { data: signatureLinks } = useQuery({
    queryKey: ["signature-links-for-whatsapp", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_links")
        .select("token, expires_at, status, recipient_type")
        .eq("sale_id", saleId)
        .eq("status", "pendiente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  // Get active signature URL + expiration
  const activeLink = signatureLinks?.[0];
  const signatureUrl = propSignatureUrl || (activeLink
    ? getSignatureLinkUrl(activeLink.token)
    : "");
  const signatureExpiration = propSignatureExpiration || (activeLink
    ? new Date(activeLink.expires_at).toLocaleString("es-PY", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "");

  const predefinedMessages = {
    signature: signatureUrl
      ? `Hola ${clientName}, tu contrato está listo para firma. Haz clic en el enlace para completar el proceso:\n\n${signatureUrl}\n\nEste enlace vence el ${signatureExpiration}. Si tienes dudas, contáctanos.`
      : `Hola ${clientName}, tu contrato está listo para firma. Genera un enlace de firma primero desde la pestaña de firma digital.`,
    questionnaire: `Hola ${clientName}, necesitamos que completes un breve cuestionario antes de proceder. Accede aquí: `,
    general: `Hola ${clientName}, tienes una actualización importante sobre tu proceso. Revisa aquí: `,
  };

  const handleSendNotification = () => {
    if (!phone || !message || !profile?.company_id) return;

    // Build template data for the Edge Function
    const templateData: Record<string, string> = {
      clientName: clientName || "Cliente",
      companyName: companyName || "SAMAP",
      message,
    };

    // Map notification type to Edge Function template name
    let templateName = "general";
    if (notificationType === "signature" && signatureUrl) {
      templateName = "signature_link";
      templateData.signatureUrl = signatureUrl;
      templateData.expirationDate = signatureExpiration;
    } else if (notificationType === "questionnaire") {
      templateName = "questionnaire";
    }

    sendNotification.mutate({
      saleId,
      recipientPhone: phone,
      messageContent: message,
      companyId: profile.company_id,
      notificationType,
      templateName,
      templateData,
    });

    setMessage("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "sent":
        return <Send className="h-4 w-4" />;
      case "sent_manual":
        return <ExternalLink className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "read":
        return <Eye className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "sent":
        return "outline";
      case "sent_manual":
        return "outline";
      case "delivered":
        return "default";
      case "read":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pendiente";
      case "sent": return "Enviado";
      case "sent_manual": return "Enviado (manual)";
      case "delivered": return "Entregado";
      case "read": return "Leído";
      case "failed": return "Error";
      default: return status;
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
            <Badge variant={isManualMode ? "secondary" : "default"} className="text-[10px] ml-1">
              {providerLabels[currentProvider]}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isManualMode
              ? "Se abrirá WhatsApp Web con el mensaje pre-cargado para envío manual"
              : "Envía enlaces de firma o cuestionarios directamente al cliente"}
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
              <Select
                value={notificationType}
                onValueChange={(value: any) => setNotificationType(value)}
              >
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
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage(predefinedMessages[notificationType])}
              >
                Usar mensaje predefinido
              </Button>
              {notificationType === "signature" && signatureUrl && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Link2 className="h-3 w-3" />
                  URL de firma incluida (vence: {signatureExpiration})
                </div>
              )}
              {notificationType === "signature" && !signatureUrl && (
                <div className="text-xs text-amber-600">
                  No hay enlace de firma activo. Genere uno primero.
                </div>
              )}
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
                {isManualMode ? "Abriendo WhatsApp..." : "Enviando..."}
              </>
            ) : isManualMode ? (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en WhatsApp
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
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 p-3 border rounded"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(notification.status)}
                        <Badge variant={getStatusColor(notification.status) as any}>
                          {getStatusLabel(notification.status)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {notification.sent_at
                          ? new Date(notification.sent_at).toLocaleString()
                          : "Pendiente"}
                      </span>
                    </div>

                    <p className="text-sm font-medium">
                      Para: {notification.phone_number}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message.substring(0, 100)}
                      {notification.message.length > 100 ? "..." : ""}
                    </p>

                    {notification.error_message && (
                      <p className="text-sm text-destructive mt-2">
                        Error: {notification.error_message}
                      </p>
                    )}

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
                            <p className="text-sm font-medium">Mensaje completo:</p>
                            <p className="text-sm bg-muted p-2 rounded">
                              {notification.message}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Estado:</p>
                            <Badge variant={getStatusColor(notification.status) as any}>
                              {getStatusLabel(notification.status)}
                            </Badge>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No se han enviado notificaciones para esta venta.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppNotificationPanel;
