
import React, { useState } from 'react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
import { useCompanyApiConfiguration } from '@/hooks/useCompanyApiConfiguration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Palette, MessageSquare, Mail, Smartphone, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const AdminConfigPanel: React.FC = () => {
  const { configuration: uiConfig, isLoading: uiLoading, updateConfiguration: updateUiConfig, isUpdating: uiUpdating } = useCompanyConfiguration();
  const { configuration: apiConfig, isLoading: apiLoading, updateConfiguration: updateApiConfig, isUpdating: apiUpdating } = useCompanyApiConfiguration();

  const [uiFormData, setUiFormData] = useState({
    login_title: uiConfig?.login_title || 'Sistema de Gestión',
    login_subtitle: uiConfig?.login_subtitle || 'Acceso al sistema',
    primary_color: uiConfig?.primary_color || '#667eea',
    secondary_color: uiConfig?.secondary_color || '#764ba2',
    login_background_url: uiConfig?.login_background_url || '',
    login_logo_url: uiConfig?.login_logo_url || '',
  });

  const [apiFormData, setApiFormData] = useState({
    whatsapp_api_enabled: apiConfig?.whatsapp_api_enabled || false,
    whatsapp_api_token: apiConfig?.whatsapp_api_token || '',
    whatsapp_phone_number: apiConfig?.whatsapp_phone_number || '',
    sms_api_enabled: apiConfig?.sms_api_enabled || false,
    sms_api_provider: apiConfig?.sms_api_provider || 'twilio',
    sms_api_key: apiConfig?.sms_api_key || '',
    sms_api_secret: apiConfig?.sms_api_secret || '',
    email_api_enabled: apiConfig?.email_api_enabled || false,
    email_api_provider: apiConfig?.email_api_provider || 'resend',
    email_api_key: apiConfig?.email_api_key || '',
    email_from_address: apiConfig?.email_from_address || '',
    tracking_enabled: apiConfig?.tracking_enabled || true,
    notifications_enabled: apiConfig?.notifications_enabled || true,
  });

  React.useEffect(() => {
    if (uiConfig) {
      setUiFormData({
        login_title: uiConfig.login_title || 'Sistema de Gestión',
        login_subtitle: uiConfig.login_subtitle || 'Acceso al sistema',
        primary_color: uiConfig.primary_color || '#667eea',
        secondary_color: uiConfig.secondary_color || '#764ba2',
        login_background_url: uiConfig.login_background_url || '',
        login_logo_url: uiConfig.login_logo_url || '',
      });
    }
  }, [uiConfig]);

  React.useEffect(() => {
    if (apiConfig) {
      setApiFormData({
        whatsapp_api_enabled: apiConfig.whatsapp_api_enabled,
        whatsapp_api_token: apiConfig.whatsapp_api_token,
        whatsapp_phone_number: apiConfig.whatsapp_phone_number,
        sms_api_enabled: apiConfig.sms_api_enabled,
        sms_api_provider: apiConfig.sms_api_provider,
        sms_api_key: apiConfig.sms_api_key,
        sms_api_secret: apiConfig.sms_api_secret,
        email_api_enabled: apiConfig.email_api_enabled,
        email_api_provider: apiConfig.email_api_provider,
        email_api_key: apiConfig.email_api_key,
        email_from_address: apiConfig.email_from_address,
        tracking_enabled: apiConfig.tracking_enabled,
        notifications_enabled: apiConfig.notifications_enabled,
      });
    }
  }, [apiConfig]);

  const handleUiSave = () => {
    updateUiConfig(uiFormData);
  };

  const handleApiSave = () => {
    updateApiConfig(apiFormData);
  };

  const handleUiInputChange = (field: string, value: any) => {
    setUiFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleApiInputChange = (field: string, value: any) => {
    setApiFormData(prev => ({ ...prev, [field]: value }));
  };

  if (uiLoading || apiLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Cargando configuración...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Configura la personalización visual y las integraciones de APIs
          </p>
        </div>
      </div>

      <Tabs defaultValue="ui" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ui" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Interfaz
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personalización de Login</CardTitle>
              <Button onClick={handleUiSave} disabled={uiUpdating}>
                {uiUpdating ? 'Guardando...' : 'Guardar UI'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="login_title">Título del Login</Label>
                  <Input
                    id="login_title"
                    value={uiFormData.login_title}
                    onChange={(e) => handleUiInputChange('login_title', e.target.value)}
                    placeholder="Sistema de Gestión"
                  />
                </div>
                <div>
                  <Label htmlFor="login_subtitle">Subtítulo del Login</Label>
                  <Input
                    id="login_subtitle"
                    value={uiFormData.login_subtitle}
                    onChange={(e) => handleUiInputChange('login_subtitle', e.target.value)}
                    placeholder="Acceso al sistema"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={uiFormData.primary_color}
                      onChange={(e) => handleUiInputChange('primary_color', e.target.value)}
                      className="w-16"
                    />
                    <Input
                      value={uiFormData.primary_color}
                      onChange={(e) => handleUiInputChange('primary_color', e.target.value)}
                      placeholder="#667eea"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={uiFormData.secondary_color}
                      onChange={(e) => handleUiInputChange('secondary_color', e.target.value)}
                      className="w-16"
                    />
                    <Input
                      value={uiFormData.secondary_color}
                      onChange={(e) => handleUiInputChange('secondary_color', e.target.value)}
                      placeholder="#764ba2"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="login_logo_url">URL del Logo</Label>
                  <Input
                    id="login_logo_url"
                    value={uiFormData.login_logo_url}
                    onChange={(e) => handleUiInputChange('login_logo_url', e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="login_background_url">URL del Fondo</Label>
                  <Input
                    id="login_background_url"
                    value={uiFormData.login_background_url}
                    onChange={(e) => handleUiInputChange('login_background_url', e.target.value)}
                    placeholder="https://ejemplo.com/background.jpg"
                  />
                </div>
              </div>

              {/* Vista previa */}
              <div className="border rounded-lg p-4 bg-muted">
                <Label className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4" />
                  Vista Previa del Login
                </Label>
                <div 
                  className="relative rounded-lg p-6 text-center text-white min-h-[200px] flex flex-col justify-center"
                  style={{
                    background: uiFormData.login_background_url 
                      ? `url(${uiFormData.login_background_url}) center/cover` 
                      : `linear-gradient(135deg, ${uiFormData.primary_color}, ${uiFormData.secondary_color})`,
                  }}
                >
                  {uiFormData.login_logo_url && (
                    <img 
                      src={uiFormData.login_logo_url} 
                      alt="Logo" 
                      className="h-12 w-auto mx-auto mb-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <h1 className="text-2xl font-bold mb-2">{uiFormData.login_title}</h1>
                  <p className="text-lg opacity-90">{uiFormData.login_subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configuración de WhatsApp API</CardTitle>
              <Button onClick={handleApiSave} disabled={apiUpdating}>
                {apiUpdating ? 'Guardando...' : 'Guardar API'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="whatsapp_enabled"
                  checked={apiFormData.whatsapp_api_enabled}
                  onCheckedChange={(checked) => handleApiInputChange('whatsapp_api_enabled', checked)}
                />
                <Label htmlFor="whatsapp_enabled">Habilitar integración con WhatsApp</Label>
              </div>

              {apiFormData.whatsapp_api_enabled && (
                <>
                  <div>
                    <Label htmlFor="whatsapp_token">Token de API</Label>
                    <Input
                      id="whatsapp_token"
                      type="password"
                      value={apiFormData.whatsapp_api_token}
                      onChange={(e) => handleApiInputChange('whatsapp_api_token', e.target.value)}
                      placeholder="Tu token de WhatsApp Business API"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_phone">Número de Teléfono</Label>
                    <Input
                      id="whatsapp_phone"
                      value={apiFormData.whatsapp_phone_number}
                      onChange={(e) => handleApiInputChange('whatsapp_phone_number', e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configuración de SMS</CardTitle>
              <Button onClick={handleApiSave} disabled={apiUpdating}>
                {apiUpdating ? 'Guardando...' : 'Guardar API'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sms_enabled"
                  checked={apiFormData.sms_api_enabled}
                  onCheckedChange={(checked) => handleApiInputChange('sms_api_enabled', checked)}
                />
                <Label htmlFor="sms_enabled">Habilitar envío de SMS</Label>
              </div>

              {apiFormData.sms_api_enabled && (
                <>
                  <div>
                    <Label htmlFor="sms_provider">Proveedor de SMS</Label>
                    <Select
                      value={apiFormData.sms_api_provider}
                      onValueChange={(value) => handleApiInputChange('sms_api_provider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="nexmo">Nexmo/Vonage</SelectItem>
                        <SelectItem value="messagebird">MessageBird</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sms_key">API Key</Label>
                      <Input
                        id="sms_key"
                        type="password"
                        value={apiFormData.sms_api_key}
                        onChange={(e) => handleApiInputChange('sms_api_key', e.target.value)}
                        placeholder="Tu API Key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sms_secret">API Secret</Label>
                      <Input
                        id="sms_secret"
                        type="password"
                        value={apiFormData.sms_api_secret}
                        onChange={(e) => handleApiInputChange('sms_api_secret', e.target.value)}
                        placeholder="Tu API Secret"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configuración de Email</CardTitle>
              <Button onClick={handleApiSave} disabled={apiUpdating}>
                {apiUpdating ? 'Guardando...' : 'Guardar API'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email_enabled"
                  checked={apiFormData.email_api_enabled}
                  onCheckedChange={(checked) => handleApiInputChange('email_api_enabled', checked)}
                />
                <Label htmlFor="email_enabled">Habilitar envío de emails</Label>
              </div>

              {apiFormData.email_api_enabled && (
                <>
                  <div>
                    <Label htmlFor="email_provider">Proveedor de Email</Label>
                    <Select
                      value={apiFormData.email_api_provider}
                      onValueChange={(value) => handleApiInputChange('email_api_provider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email_key">API Key</Label>
                      <Input
                        id="email_key"
                        type="password"
                        value={apiFormData.email_api_key}
                        onChange={(e) => handleApiInputChange('email_api_key', e.target.value)}
                        placeholder="Tu API Key de email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email_from">Email Remitente</Label>
                      <Input
                        id="email_from"
                        value={apiFormData.email_from_address}
                        onChange={(e) => handleApiInputChange('email_from_address', e.target.value)}
                        placeholder="noreply@tuempresa.com"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
