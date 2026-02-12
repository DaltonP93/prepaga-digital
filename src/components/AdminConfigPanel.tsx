import React, { useState } from 'react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
import { useCompanyApiConfiguration, WhatsAppProvider } from '@/hooks/useCompanyApiConfiguration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Palette, MessageSquare, Mail, Smartphone, Eye, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const AdminConfigPanel: React.FC = () => {
  const { configuration: uiConfig, isLoading: uiLoading, updateConfiguration: updateUiConfig, isUpdating: uiUpdating } = useCompanyConfiguration();
  const { configuration: apiConfig, isLoading: apiLoading, updateConfiguration: updateApiConfig, isUpdating: apiUpdating } = useCompanyApiConfiguration();

  const [uiFormData, setUiFormData] = useState({
    login_title: uiConfig?.login_title || 'Sistema de Gestión',
    login_subtitle: uiConfig?.login_subtitle || 'Acceso al sistema',
    primary_color: uiConfig?.primary_color || '#1e3a5f',
    secondary_color: uiConfig?.secondary_color || '#334155',
    login_background_url: uiConfig?.login_background_url || '',
    login_logo_url: uiConfig?.login_logo_url || '',
  });

  const [apiFormData, setApiFormData] = useState({
    whatsapp_provider: apiConfig?.whatsapp_provider || 'wame_fallback' as WhatsAppProvider,
    whatsapp_api_token: apiConfig?.whatsapp_api_token || '',
    whatsapp_phone_number: apiConfig?.whatsapp_phone_number || '',
    twilio_account_sid: apiConfig?.twilio_account_sid || '',
    twilio_auth_token: apiConfig?.twilio_auth_token || '',
    twilio_whatsapp_number: apiConfig?.twilio_whatsapp_number || '',
    sms_api_enabled: apiConfig?.sms_api_enabled || false,
    sms_api_key: apiConfig?.sms_api_key || '',
    email_api_enabled: apiConfig?.email_api_enabled || false,
    email_api_key: apiConfig?.email_api_key || '',
    email_from_address: apiConfig?.email_from_address || '',
    email_from_name: apiConfig?.email_from_name || '',
  });

  React.useEffect(() => {
    if (uiConfig) {
      setUiFormData({
        login_title: uiConfig.login_title || 'Sistema de Gestión',
        login_subtitle: uiConfig.login_subtitle || 'Acceso al sistema',
        primary_color: uiConfig.primary_color || '#1e3a5f',
        secondary_color: uiConfig.secondary_color || '#334155',
        login_background_url: uiConfig.login_background_url || '',
        login_logo_url: uiConfig.login_logo_url || '',
      });
    }
  }, [uiConfig]);

  React.useEffect(() => {
    if (apiConfig) {
      setApiFormData({
        whatsapp_provider: apiConfig.whatsapp_provider || 'wame_fallback',
        whatsapp_api_token: apiConfig.whatsapp_api_token || '',
        whatsapp_phone_number: apiConfig.whatsapp_phone_number || '',
        twilio_account_sid: apiConfig.twilio_account_sid || '',
        twilio_auth_token: apiConfig.twilio_auth_token || '',
        twilio_whatsapp_number: apiConfig.twilio_whatsapp_number || '',
        sms_api_enabled: apiConfig.sms_api_enabled || false,
        sms_api_key: apiConfig.sms_api_key || '',
        email_api_enabled: apiConfig.email_api_enabled || false,
        email_api_key: apiConfig.email_api_key || '',
        email_from_address: apiConfig.email_from_address || '',
        email_from_name: apiConfig.email_from_name || '',
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

  const getProviderStatus = (): { connected: boolean; label: string } => {
    const provider = apiFormData.whatsapp_provider;
    if (provider === 'meta') {
      return {
        connected: !!apiFormData.whatsapp_api_token && !!apiFormData.whatsapp_phone_number,
        label: 'Meta Business API',
      };
    }
    if (provider === 'twilio') {
      return {
        connected: !!apiFormData.twilio_account_sid && !!apiFormData.twilio_auth_token && !!apiFormData.twilio_whatsapp_number,
        label: 'Twilio',
      };
    }
    return { connected: true, label: 'wa.me (Manual)' };
  };

  const providerStatus = getProviderStatus();

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
      <Tabs defaultValue="whatsapp" className="space-y-4">
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

        {/* UI Tab */}
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
                    <Input id="primary_color" type="color" value={uiFormData.primary_color} onChange={(e) => handleUiInputChange('primary_color', e.target.value)} className="w-16" />
                    <Input value={uiFormData.primary_color} onChange={(e) => handleUiInputChange('primary_color', e.target.value)} placeholder="#1e3a5f" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input id="secondary_color" type="color" value={uiFormData.secondary_color} onChange={(e) => handleUiInputChange('secondary_color', e.target.value)} className="w-16" />
                    <Input value={uiFormData.secondary_color} onChange={(e) => handleUiInputChange('secondary_color', e.target.value)} placeholder="#334155" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="login_logo_url">URL del Logo</Label>
                  <Input id="login_logo_url" value={uiFormData.login_logo_url} onChange={(e) => handleUiInputChange('login_logo_url', e.target.value)} placeholder="https://ejemplo.com/logo.png" />
                </div>
                <div>
                  <Label htmlFor="login_background_url">URL del Fondo</Label>
                  <Input id="login_background_url" value={uiFormData.login_background_url} onChange={(e) => handleUiInputChange('login_background_url', e.target.value)} placeholder="https://ejemplo.com/background.jpg" />
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-muted">
                <Label className="flex items-center gap-2 mb-2"><Eye className="h-4 w-4" />Vista Previa del Login</Label>
                <div className="relative rounded-lg p-6 text-center text-white min-h-[200px] flex flex-col justify-center" style={{ background: uiFormData.login_background_url ? `url(${uiFormData.login_background_url}) center/cover` : `linear-gradient(135deg, ${uiFormData.primary_color}, ${uiFormData.secondary_color})` }}>
                  {uiFormData.login_logo_url && (<img src={uiFormData.login_logo_url} alt="Logo" className="h-12 w-auto mx-auto mb-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
                  <h1 className="text-2xl font-bold mb-2">{uiFormData.login_title}</h1>
                  <p className="text-lg opacity-90">{uiFormData.login_subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  Configuración de WhatsApp
                  {providerStatus.connected ? (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {providerStatus.label}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Sin configurar
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Selecciona el proveedor para enviar mensajes de WhatsApp
                </CardDescription>
              </div>
              <Button onClick={handleApiSave} disabled={apiUpdating}>
                {apiUpdating ? 'Guardando...' : 'Guardar'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selector */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Proveedor de WhatsApp</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Meta Business API */}
                  <div
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.whatsapp_provider === 'meta' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => handleApiInputChange('whatsapp_provider', 'meta')}
                  >
                    <div className="font-medium">Meta Business API</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Envío automático via API oficial de WhatsApp (Facebook). Requiere cuenta Business verificada.
                    </p>
                    {apiFormData.whatsapp_provider === 'meta' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Twilio */}
                  <div
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.whatsapp_provider === 'twilio' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => handleApiInputChange('whatsapp_provider', 'twilio')}
                  >
                    <div className="font-medium">Twilio</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Envío via Twilio WhatsApp Sandbox o número verificado. Fácil de configurar.
                    </p>
                    {apiFormData.whatsapp_provider === 'twilio' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* wa.me Fallback */}
                  <div
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.whatsapp_provider === 'wame_fallback' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => handleApiInputChange('whatsapp_provider', 'wame_fallback')}
                  >
                    <div className="font-medium flex items-center gap-1">
                      wa.me
                      <Badge variant="secondary" className="text-[10px]">Sin API</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Abre WhatsApp Web con el mensaje pre-cargado. No requiere API ni cuenta Business.
                    </p>
                    {apiFormData.whatsapp_provider === 'wame_fallback' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta Business API Fields */}
              {apiFormData.whatsapp_provider === 'meta' && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium">Credenciales Meta Business API</h4>
                  <div>
                    <Label htmlFor="whatsapp_token">Token de API (Permanent)</Label>
                    <Input
                      id="whatsapp_token"
                      type="password"
                      value={apiFormData.whatsapp_api_token}
                      onChange={(e) => handleApiInputChange('whatsapp_api_token', e.target.value)}
                      placeholder="EAAxxxxxxx..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Token permanente de la app en Meta for Developers
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_phone_id">Phone Number ID</Label>
                    <Input
                      id="whatsapp_phone_id"
                      value={apiFormData.whatsapp_phone_number}
                      onChange={(e) => handleApiInputChange('whatsapp_phone_number', e.target.value)}
                      placeholder="1234567890"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ID del número en WhatsApp Business Account
                    </p>
                  </div>
                </div>
              )}

              {/* Twilio Fields */}
              {apiFormData.whatsapp_provider === 'twilio' && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium">Credenciales Twilio</h4>
                  <div>
                    <Label htmlFor="twilio_sid">Account SID</Label>
                    <Input
                      id="twilio_sid"
                      value={apiFormData.twilio_account_sid}
                      onChange={(e) => handleApiInputChange('twilio_account_sid', e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twilio_token">Auth Token</Label>
                    <Input
                      id="twilio_token"
                      type="password"
                      value={apiFormData.twilio_auth_token}
                      onChange={(e) => handleApiInputChange('twilio_auth_token', e.target.value)}
                      placeholder="Tu Auth Token de Twilio"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twilio_number">Número WhatsApp Twilio</Label>
                    <Input
                      id="twilio_number"
                      value={apiFormData.twilio_whatsapp_number}
                      onChange={(e) => handleApiInputChange('twilio_whatsapp_number', e.target.value)}
                      placeholder="+14155238886"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Formato: +[código país][número]. Para sandbox: +14155238886
                    </p>
                  </div>
                </div>
              )}

              {/* wa.me Fallback Info */}
              {apiFormData.whatsapp_provider === 'wame_fallback' && (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Modo Manual (wa.me)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Al enviar una notificación, se abrirá WhatsApp Web en una nueva pestaña con el mensaje
                    pre-cargado y el número del cliente. El vendedor solo necesita presionar "Enviar" en WhatsApp.
                  </p>
                  <div className="text-sm space-y-1">
                    <p><strong>Ventajas:</strong> No requiere API ni cuenta Business</p>
                    <p><strong>Limitación:</strong> Requiere acción manual del usuario para enviar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
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
                <Switch id="sms_enabled" checked={apiFormData.sms_api_enabled} onCheckedChange={(checked) => handleApiInputChange('sms_api_enabled', checked)} />
                <Label htmlFor="sms_enabled">Habilitar envío de SMS</Label>
              </div>
              {apiFormData.sms_api_enabled && (
                <div>
                  <Label htmlFor="sms_key">API Key</Label>
                  <Input id="sms_key" type="password" value={apiFormData.sms_api_key} onChange={(e) => handleApiInputChange('sms_api_key', e.target.value)} placeholder="Tu API Key" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
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
                <Switch id="email_enabled" checked={apiFormData.email_api_enabled} onCheckedChange={(checked) => handleApiInputChange('email_api_enabled', checked)} />
                <Label htmlFor="email_enabled">Habilitar envío de emails</Label>
              </div>
              {apiFormData.email_api_enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email_key">API Key</Label>
                    <Input id="email_key" type="password" value={apiFormData.email_api_key} onChange={(e) => handleApiInputChange('email_api_key', e.target.value)} placeholder="Tu API Key de email" />
                  </div>
                  <div>
                    <Label htmlFor="email_from">Email Remitente</Label>
                    <Input id="email_from" value={apiFormData.email_from_address} onChange={(e) => handleApiInputChange('email_from_address', e.target.value)} placeholder="noreply@tuempresa.com" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
