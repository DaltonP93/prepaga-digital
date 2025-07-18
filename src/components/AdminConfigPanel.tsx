
import React, { useState } from 'react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
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
  const { configuration, isLoading, updateConfiguration, isUpdating } = useCompanyConfiguration();
  const [formData, setFormData] = useState({
    // UI Configuration
    login_title: configuration?.login_title || 'Sistema de Gestión',
    login_subtitle: configuration?.login_subtitle || 'Acceso al sistema',
    primary_color: configuration?.primary_color || '#667eea',
    secondary_color: configuration?.secondary_color || '#764ba2',
    login_background_url: configuration?.login_background_url || '',
    login_logo_url: configuration?.login_logo_url || '',
    
    // WhatsApp Configuration
    whatsapp_api_enabled: configuration?.whatsapp_api_enabled || false,
    whatsapp_api_token: configuration?.whatsapp_api_token || '',
    whatsapp_phone_number: configuration?.whatsapp_phone_number || '',
    
    // SMS Configuration
    sms_api_enabled: configuration?.sms_api_enabled || false,
    sms_api_provider: configuration?.sms_api_provider || 'twilio',
    sms_api_key: configuration?.sms_api_key || '',
    sms_api_secret: configuration?.sms_api_secret || '',
    
    // Email Configuration
    email_api_enabled: configuration?.email_api_enabled || false,
    email_api_provider: configuration?.email_api_provider || 'resend',
    email_api_key: configuration?.email_api_key || '',
    email_from_address: configuration?.email_from_address || '',
    
    // General Settings
    tracking_enabled: configuration?.tracking_enabled || true,
    notifications_enabled: configuration?.notifications_enabled || true,
  });

  React.useEffect(() => {
    if (configuration) {
      setFormData({
        login_title: configuration.login_title || 'Sistema de Gestión',
        login_subtitle: configuration.login_subtitle || 'Acceso al sistema',
        primary_color: configuration.primary_color || '#667eea',
        secondary_color: configuration.secondary_color || '#764ba2',
        login_background_url: configuration.login_background_url || '',
        login_logo_url: configuration.login_logo_url || '',
        whatsapp_api_enabled: configuration.whatsapp_api_enabled || false,
        whatsapp_api_token: configuration.whatsapp_api_token || '',
        whatsapp_phone_number: configuration.whatsapp_phone_number || '',
        sms_api_enabled: configuration.sms_api_enabled || false,
        sms_api_provider: configuration.sms_api_provider || 'twilio',
        sms_api_key: configuration.sms_api_key || '',
        sms_api_secret: configuration.sms_api_secret || '',
        email_api_enabled: configuration.email_api_enabled || false,
        email_api_provider: configuration.email_api_provider || 'resend',
        email_api_key: configuration.email_api_key || '',
        email_from_address: configuration.email_from_address || '',
        tracking_enabled: configuration.tracking_enabled || true,
        notifications_enabled: configuration.notifications_enabled || true,
      });
    }
  }, [configuration]);

  const handleSave = () => {
    updateConfiguration(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
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
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
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
            <CardHeader>
              <CardTitle>Personalización de Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="login_title">Título del Login</Label>
                  <Input
                    id="login_title"
                    value={formData.login_title}
                    onChange={(e) => handleInputChange('login_title', e.target.value)}
                    placeholder="Sistema de Gestión"
                  />
                </div>
                <div>
                  <Label htmlFor="login_subtitle">Subtítulo del Login</Label>
                  <Input
                    id="login_subtitle"
                    value={formData.login_subtitle}
                    onChange={(e) => handleInputChange('login_subtitle', e.target.value)}
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
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-16"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
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
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-16"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
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
                    value={formData.login_logo_url}
                    onChange={(e) => handleInputChange('login_logo_url', e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="login_background_url">URL del Fondo</Label>
                  <Input
                    id="login_background_url"
                    value={formData.login_background_url}
                    onChange={(e) => handleInputChange('login_background_url', e.target.value)}
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
                    background: formData.login_background_url 
                      ? `url(${formData.login_background_url}) center/cover` 
                      : `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
                  }}
                >
                  {formData.login_logo_url && (
                    <img 
                      src={formData.login_logo_url} 
                      alt="Logo" 
                      className="h-12 w-auto mx-auto mb-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <h1 className="text-2xl font-bold mb-2">{formData.login_title}</h1>
                  <p className="text-lg opacity-90">{formData.login_subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de WhatsApp API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="whatsapp_enabled"
                  checked={formData.whatsapp_api_enabled}
                  onCheckedChange={(checked) => handleInputChange('whatsapp_api_enabled', checked)}
                />
                <Label htmlFor="whatsapp_enabled">Habilitar integración con WhatsApp</Label>
              </div>

              {formData.whatsapp_api_enabled && (
                <>
                  <div>
                    <Label htmlFor="whatsapp_token">Token de API</Label>
                    <Input
                      id="whatsapp_token"
                      type="password"
                      value={formData.whatsapp_api_token}
                      onChange={(e) => handleInputChange('whatsapp_api_token', e.target.value)}
                      placeholder="Tu token de WhatsApp Business API"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_phone">Número de Teléfono</Label>
                    <Input
                      id="whatsapp_phone"
                      value={formData.whatsapp_phone_number}
                      onChange={(e) => handleInputChange('whatsapp_phone_number', e.target.value)}
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
            <CardHeader>
              <CardTitle>Configuración de SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sms_enabled"
                  checked={formData.sms_api_enabled}
                  onCheckedChange={(checked) => handleInputChange('sms_api_enabled', checked)}
                />
                <Label htmlFor="sms_enabled">Habilitar envío de SMS</Label>
              </div>

              {formData.sms_api_enabled && (
                <>
                  <div>
                    <Label htmlFor="sms_provider">Proveedor de SMS</Label>
                    <Select
                      value={formData.sms_api_provider}
                      onValueChange={(value) => handleInputChange('sms_api_provider', value)}
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
                        value={formData.sms_api_key}
                        onChange={(e) => handleInputChange('sms_api_key', e.target.value)}
                        placeholder="Tu API Key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sms_secret">API Secret</Label>
                      <Input
                        id="sms_secret"
                        type="password"
                        value={formData.sms_api_secret}
                        onChange={(e) => handleInputChange('sms_api_secret', e.target.value)}
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
            <CardHeader>
              <CardTitle>Configuración de Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email_enabled"
                  checked={formData.email_api_enabled}
                  onCheckedChange={(checked) => handleInputChange('email_api_enabled', checked)}
                />
                <Label htmlFor="email_enabled">Habilitar envío de emails</Label>
              </div>

              {formData.email_api_enabled && (
                <>
                  <div>
                    <Label htmlFor="email_provider">Proveedor de Email</Label>
                    <Select
                      value={formData.email_api_provider}
                      onValueChange={(value) => handleInputChange('email_api_provider', value)}
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
                        value={formData.email_api_key}
                        onChange={(e) => handleInputChange('email_api_key', e.target.value)}
                        placeholder="Tu API Key de email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email_from">Email Remitente</Label>
                      <Input
                        id="email_from"
                        value={formData.email_from_address}
                        onChange={(e) => handleInputChange('email_from_address', e.target.value)}
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
