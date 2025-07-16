import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Mail, MessageSquare, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailConfig {
  provider: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  templates: {
    signature: string;
    reminder: string;
    questionnaire: string;
  };
}

interface SMSConfig {
  provider: string;
  apiKey: string;
  fromNumber: string;
  templates: {
    signature: string;
    reminder: string;
    questionnaire: string;
  };
}

interface WhatsAppConfig {
  provider: string;
  apiKey: string;
  fromNumber: string;
  templates: {
    signature: string;
    reminder: string;
    questionnaire: string;
  };
}

export const AdminConfigPanel = () => {
  const { toast } = useToast();
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  const emailForm = useForm<EmailConfig>({
    defaultValues: {
      provider: "resend",
      apiKey: "",
      fromEmail: "",
      fromName: "",
      templates: {
        signature: "Hola {{cliente.nombre}}, tienes un documento para firmar: {{enlace}}",
        reminder: "Recordatorio: Tienes un documento pendiente de firma: {{enlace}}",
        questionnaire: "Hola {{cliente.nombre}}, completa tu cuestionario: {{enlace}}"
      }
    }
  });

  const smsForm = useForm<SMSConfig>({
    defaultValues: {
      provider: "twilio",
      apiKey: "",
      fromNumber: "",
      templates: {
        signature: "Tienes un documento para firmar: {{enlace}}",
        reminder: "Recordatorio: Documento pendiente de firma: {{enlace}}",
        questionnaire: "Completa tu cuestionario: {{enlace}}"
      }
    }
  });

  const whatsappForm = useForm<WhatsAppConfig>({
    defaultValues: {
      provider: "twilio",
      apiKey: "",
      fromNumber: "",
      templates: {
        signature: "Hola {{cliente.nombre}}, tienes un documento para firmar: {{enlace}}",
        reminder: "Recordatorio: Tienes un documento pendiente de firma: {{enlace}}",
        questionnaire: "Hola {{cliente.nombre}}, completa tu cuestionario: {{enlace}}"
      }
    }
  });

  const saveEmailConfig = async (data: EmailConfig) => {
    try {
      // TODO: Save email configuration to database
      toast({
        title: "Configuración guardada",
        description: "La configuración de email ha sido guardada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de email",
        variant: "destructive",
      });
    }
  };

  const saveSMSConfig = async (data: SMSConfig) => {
    try {
      // TODO: Save SMS configuration to database
      toast({
        title: "Configuración guardada",
        description: "La configuración de SMS ha sido guardada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de SMS",
        variant: "destructive",
      });
    }
  };

  const saveWhatsAppConfig = async (data: WhatsAppConfig) => {
    try {
      // TODO: Save WhatsApp configuration to database
      toast({
        title: "Configuración guardada",
        description: "La configuración de WhatsApp ha sido guardada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de WhatsApp",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Panel de Configuración</h2>
        <Badge variant="secondary">Solo para Administradores</Badge>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuración de Email</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="email-enabled">Habilitado</Label>
                  <Switch
                    id="email-enabled"
                    checked={emailEnabled}
                    onCheckedChange={setEmailEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={emailForm.handleSubmit(saveEmailConfig)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input {...emailForm.register("provider")} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input {...emailForm.register("apiKey")} type="password" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email remitente</Label>
                    <Input {...emailForm.register("fromEmail")} type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre remitente</Label>
                    <Input {...emailForm.register("fromName")} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Plantillas de Mensajes</h4>
                  
                  <div className="space-y-2">
                    <Label>Template para Firma</Label>
                    <Textarea {...emailForm.register("templates.signature")} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Template para Recordatorio</Label>
                    <Textarea {...emailForm.register("templates.reminder")} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Template para Cuestionario</Label>
                    <Textarea {...emailForm.register("templates.questionnaire")} />
                  </div>
                </div>

                <Button type="submit" disabled={!emailEnabled}>
                  Guardar Configuración de Email
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuración de SMS</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="sms-enabled">Habilitado</Label>
                  <Switch
                    id="sms-enabled"
                    checked={smsEnabled}
                    onCheckedChange={setSmsEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={smsForm.handleSubmit(saveSMSConfig)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input {...smsForm.register("provider")} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input {...smsForm.register("apiKey")} type="password" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Número remitente</Label>
                  <Input {...smsForm.register("fromNumber")} />
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Plantillas de Mensajes</h4>
                  
                  <div className="space-y-2">
                    <Label>Template para Firma</Label>
                    <Textarea {...smsForm.register("templates.signature")} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Template para Recordatorio</Label>
                    <Textarea {...smsForm.register("templates.reminder")} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Template para Cuestionario</Label>
                    <Textarea {...smsForm.register("templates.questionnaire")} />
                  </div>
                </div>

                <Button type="submit" disabled={!smsEnabled}>
                  Guardar Configuración de SMS
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuración de WhatsApp</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="whatsapp-enabled">Habilitado</Label>
                  <Switch
                    id="whatsapp-enabled"
                    checked={whatsappEnabled}
                    onCheckedChange={setWhatsappEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={whatsappForm.handleSubmit(saveWhatsAppConfig)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input {...whatsappForm.register("provider")} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input {...whatsappForm.register("apiKey")} type="password" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Número de WhatsApp Business</Label>
                  <Input {...whatsappForm.register("fromNumber")} />
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Plantillas de Mensajes</h4>
                  
                  <div className="space-y-2">
                    <Label>Template para Firma</Label>
                    <Textarea {...whatsappForm.register("templates.signature")} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Template para Recordatorio</Label>
                    <Textarea {...whatsappForm.register("templates.reminder")} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Template para Cuestionario</Label>
                    <Textarea {...whatsappForm.register("templates.questionnaire")} />
                  </div>
                </div>

                <Button type="submit" disabled={!whatsappEnabled}>
                  Guardar Configuración de WhatsApp
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Variables Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium mb-2">Cliente:</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>{'{{cliente.nombre}}'}</li>
                <li>{'{{cliente.email}}'}</li>
                <li>{'{{cliente.telefono}}'}</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Plan:</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>{'{{plan.nombre}}'}</li>
                <li>{'{{plan.precio}}'}</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Enlaces:</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>{'{{enlace}}'}</li>
                <li>{'{{fecha_vencimiento}}'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};