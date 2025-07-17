
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuthContext } from "@/components/AuthProvider";
import { Save, Key, MessageSquare, Mail, Smartphone } from "lucide-react";

export function APIConfigPanel() {
  const { toast } = useToast();
  const { profile } = useAuthContext();
  const { settings, updateSettings, isLoading } = useCompanySettings();
  
  const [formData, setFormData] = useState({
    resend_api_key: settings?.resend_api_key || "",
    whatsapp_api_key: settings?.whatsapp_api_key || "",
    twilio_account_sid: settings?.twilio_account_sid || "",
    twilio_auth_token: settings?.twilio_auth_token || "",
    sms_api_key: settings?.sms_api_key || "",
  });

  const canManageSettings = profile?.role === 'super_admin' || profile?.role === 'admin';

  if (!canManageSettings) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No tienes permisos para acceder a la configuración API.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast({
        title: "Configuración guardada",
        description: "Las claves API han sido actualizadas correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración API</h2>
        <p className="text-muted-foreground">
          Configura las integraciones de comunicación para tu empresa
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sms">
            <Smartphone className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuración Email (Resend)
              </CardTitle>
              <CardDescription>
                Configura tu API key de Resend para envío de emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend_api_key">API Key de Resend</Label>
                <Input
                  id="resend_api_key"
                  type="password"
                  placeholder="re_..."
                  value={formData.resend_api_key}
                  onChange={(e) => handleInputChange('resend_api_key', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Obtén tu API key en <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">resend.com/api-keys</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Configuración WhatsApp
              </CardTitle>
              <CardDescription>
                Configura tu API key para envío por WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_api_key">API Key de WhatsApp</Label>
                <Input
                  id="whatsapp_api_key"
                  type="password"
                  placeholder="Ingresa tu API key de WhatsApp"
                  value={formData.whatsapp_api_key}
                  onChange={(e) => handleInputChange('whatsapp_api_key', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Configura tu integración de WhatsApp Business API
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Configuración SMS (Twilio)
              </CardTitle>
              <CardDescription>
                Configura Twilio para envío de SMS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twilio_account_sid">Account SID</Label>
                  <Input
                    id="twilio_account_sid"
                    type="password"
                    placeholder="AC..."
                    value={formData.twilio_account_sid}
                    onChange={(e) => handleInputChange('twilio_account_sid', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilio_auth_token">Auth Token</Label>
                  <Input
                    id="twilio_auth_token"
                    type="password"
                    placeholder="Tu Auth Token"
                    value={formData.twilio_auth_token}
                    onChange={(e) => handleInputChange('twilio_auth_token', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Obtén tus credenciales en <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.twilio.com</a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending || isLoading}
          className="min-w-[120px]"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
