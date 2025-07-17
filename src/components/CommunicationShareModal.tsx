import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Phone, Copy, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCommunications } from '@/hooks/useCommunications';
import QRCode from 'qrcode';

interface CommunicationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  shareUrl: string;
  shareType: 'questionnaire' | 'signature';
}

const CommunicationShareModal = ({
  isOpen,
  onClose,
  saleId,
  clientName,
  clientEmail,
  clientPhone,
  shareUrl,
  shareType
}: CommunicationShareModalProps) => {
  const { toast } = useToast();
  const { sendCommunication, isLoading } = useCommunications();
  const [customMessage, setCustomMessage] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const defaultMessages = {
    questionnaire: {
      email: `Hola ${clientName},\n\nPor favor completa tu declaración jurada haciendo clic en el siguiente enlace:\n${shareUrl}\n\nGracias.`,
      sms: `Hola ${clientName}, completa tu declaración jurada en: ${shareUrl}`,
      whatsapp: `Hola ${clientName}! 👋\n\nPor favor completa tu declaración jurada haciendo clic aquí:\n${shareUrl}\n\n¡Gracias! 😊`
    },
    signature: {
      email: `Hola ${clientName},\n\nTu documento está listo para firmar. Accede al siguiente enlace:\n${shareUrl}\n\nGracias.`,
      sms: `${clientName}, tu documento está listo para firmar: ${shareUrl}`,
      whatsapp: `Hola ${clientName}! 📋\n\nTu documento está listo para firmar:\n${shareUrl}\n\n¡Gracias! ✅`
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Éxito",
        description: "URL copiada al portapapeles"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive"
      });
    }
  };

  const handleOpenUrl = () => {
    window.open(shareUrl, '_blank');
  };

  const generateQRCode = async () => {
    try {
      const qrUrl = await QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el código QR",
        variant: "destructive"
      });
    }
  };

  const handleSendCommunication = async (type: 'email' | 'sms' | 'whatsapp') => {
    if (!customMessage.trim()) {
      toast({
        title: "Error",
        description: "El mensaje no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    const recipient = type === 'email' ? clientEmail : clientPhone;
    if (!recipient) {
      toast({
        title: "Error",
        description: `No se encontró ${type === 'email' ? 'email' : 'teléfono'} del cliente`,
        variant: "destructive"
      });
      return;
    }

    try {
      await sendCommunication.mutateAsync({
        type,
        recipientId: saleId,
        recipientEmail: type === 'email' ? recipient : undefined,
        recipientPhone: type !== 'email' ? recipient : undefined,
        content: customMessage,
        subject: type === 'email' ? `${shareType === 'questionnaire' ? 'Declaración Jurada' : 'Documento para Firmar'} - ${clientName}` : undefined
      });

      toast({
        title: "Éxito",
        description: `${type === 'email' ? 'Email' : type === 'sms' ? 'SMS' : 'WhatsApp'} enviado correctamente`
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al enviar ${type}`,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Compartir {shareType === 'questionnaire' ? 'Declaración Jurada' : 'Documento'} - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL y acciones rápidas */}
          <div className="space-y-3">
            <Label>URL del documento</Label>
            <div className="flex gap-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleOpenUrl}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={generateQRCode}>
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Código QR */}
          {qrCodeUrl && (
            <div className="flex justify-center">
              <div className="text-center space-y-2">
                <img src={qrCodeUrl} alt="Código QR" className="mx-auto" />
                <p className="text-sm text-muted-foreground">Código QR para compartir</p>
              </div>
            </div>
          )}

          {/* Información del cliente */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-sm font-medium">Cliente</Label>
              <p className="text-sm">{clientName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Contacto</Label>
              <div className="flex flex-wrap gap-2">
                {clientEmail && (
                  <Badge variant="secondary" className="text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    {clientEmail}
                  </Badge>
                )}
                {clientPhone && (
                  <Badge variant="secondary" className="text-xs">
                    <Phone className="h-3 w-3 mr-1" />
                    {clientPhone}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Tabs de comunicación */}
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" disabled={!clientEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" disabled={!clientPhone}>
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="whatsapp" disabled={!clientPhone}>
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <Label>Mensaje de Email</Label>
                <Textarea
                  value={customMessage || defaultMessages[shareType].email}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  placeholder="Escribe tu mensaje personalizado..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCustomMessage(defaultMessages[shareType].email)}
                  variant="outline"
                  size="sm"
                >
                  Usar mensaje por defecto
                </Button>
                <Button
                  onClick={() => handleSendCommunication('email')}
                  disabled={isLoading || !clientEmail}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </Button>
              </div>
            </TabsContent>

            {/* SMS Tab */}
            <TabsContent value="sms" className="space-y-4">
              <div className="space-y-2">
                <Label>Mensaje SMS</Label>
                <Textarea
                  value={customMessage || defaultMessages[shareType].sms}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  placeholder="Escribe tu mensaje personalizado..."
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {(customMessage || defaultMessages[shareType].sms).length}/160 caracteres
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCustomMessage(defaultMessages[shareType].sms)}
                  variant="outline"
                  size="sm"
                >
                  Usar mensaje por defecto
                </Button>
                <Button
                  onClick={() => handleSendCommunication('sms')}
                  disabled={isLoading || !clientPhone}
                  className="flex-1"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar SMS
                </Button>
              </div>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-4">
              <div className="space-y-2">
                <Label>Mensaje WhatsApp</Label>
                <Textarea
                  value={customMessage || defaultMessages[shareType].whatsapp}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={5}
                  placeholder="Escribe tu mensaje personalizado..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCustomMessage(defaultMessages[shareType].whatsapp)}
                  variant="outline"
                  size="sm"
                >
                  Usar mensaje por defecto
                </Button>
                <Button
                  onClick={() => handleSendCommunication('whatsapp')}
                  disabled={isLoading || !clientPhone}
                  className="flex-1"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommunicationShareModal;