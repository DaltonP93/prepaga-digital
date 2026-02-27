import React, { useMemo, useRef, useState } from 'react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
import { useCompanyApiConfiguration, WhatsAppProvider, EmailProvider } from '@/hooks/useCompanyApiConfiguration';
import { getWhatsAppWebhookUrl } from '@/lib/appUrls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Palette, MessageSquare, Mail, Smartphone, Eye, CheckCircle, XCircle, ExternalLink, Copy, PenTool, Loader2, TestTube, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdminConfigPanel: React.FC = () => {
  const { configuration: uiConfig, isLoading: uiLoading, updateConfiguration: updateUiConfig, isUpdating: uiUpdating } = useCompanyConfiguration();
  const { configuration: apiConfig, isLoading: apiLoading, updateConfiguration: updateApiConfig, isUpdating: apiUpdating } = useCompanyApiConfiguration();

  const defaultUiFormData = {
    login_title: 'Sistema de Gestión',
    login_subtitle: 'Acceso al sistema',
    primary_color: '#1e3a5f',
    secondary_color: '#334155',
    login_background_url: '',
    login_logo_url: '',
  };

  const defaultApiFormData = {
    whatsapp_provider: 'wame_fallback' as WhatsAppProvider,
    whatsapp_api_token: '',
    whatsapp_phone_number: '',
    whatsapp_gateway_url: '',
    whatsapp_linked_phone: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_whatsapp_number: '',
    sms_api_enabled: false,
    sms_api_key: '',
    email_provider: 'resend' as EmailProvider,
    email_api_enabled: false,
    email_api_key: '',
    email_from_address: '',
    email_from_name: '',
    signwell_enabled: false,
    signwell_api_key: '',
  };

  const [uiFormData, setUiFormData] = useState(defaultUiFormData);
  const [apiFormData, setApiFormData] = useState(defaultApiFormData);
  const [signwellTesting, setSignwellTesting] = useState(false);
  const [whatsappTesting, setWhatsappTesting] = useState(false);
  const [whatsappTestPhone, setWhatsappTestPhone] = useState('');
  const { profile } = useSimpleAuthContext();
  const lastUiSyncKeyRef = useRef<string>('');
  const lastApiSyncKeyRef = useRef<string>('');

  const hasUiChanges = (
    current: typeof uiFormData,
    next: typeof uiFormData,
  ): boolean => {
    return (
      current.login_title !== next.login_title ||
      current.login_subtitle !== next.login_subtitle ||
      current.primary_color !== next.primary_color ||
      current.secondary_color !== next.secondary_color ||
      current.login_background_url !== next.login_background_url ||
      current.login_logo_url !== next.login_logo_url
    );
  };

  const hasApiChanges = (
    current: typeof apiFormData,
    next: typeof apiFormData,
  ): boolean => {
    return (
      current.whatsapp_provider !== next.whatsapp_provider ||
      current.whatsapp_api_token !== next.whatsapp_api_token ||
      current.whatsapp_phone_number !== next.whatsapp_phone_number ||
      current.whatsapp_gateway_url !== next.whatsapp_gateway_url ||
      current.whatsapp_linked_phone !== next.whatsapp_linked_phone ||
      current.twilio_account_sid !== next.twilio_account_sid ||
      current.twilio_auth_token !== next.twilio_auth_token ||
      current.twilio_whatsapp_number !== next.twilio_whatsapp_number ||
      current.sms_api_enabled !== next.sms_api_enabled ||
      current.sms_api_key !== next.sms_api_key ||
      current.email_provider !== next.email_provider ||
      current.email_api_enabled !== next.email_api_enabled ||
      current.email_api_key !== next.email_api_key ||
      current.email_from_address !== next.email_from_address ||
      current.email_from_name !== next.email_from_name ||
      current.signwell_enabled !== next.signwell_enabled ||
      current.signwell_api_key !== next.signwell_api_key
    );
  };

  const nextUiFormData = useMemo(() => ({
    login_title: uiConfig?.login_title || defaultUiFormData.login_title,
    login_subtitle: uiConfig?.login_subtitle || defaultUiFormData.login_subtitle,
    primary_color: uiConfig?.primary_color || defaultUiFormData.primary_color,
    secondary_color: uiConfig?.secondary_color || defaultUiFormData.secondary_color,
    login_background_url: uiConfig?.login_background_url || defaultUiFormData.login_background_url,
    login_logo_url: uiConfig?.login_logo_url || defaultUiFormData.login_logo_url,
  }), [uiConfig]);

  const nextApiFormData = useMemo(() => ({
    whatsapp_provider: apiConfig?.whatsapp_provider || defaultApiFormData.whatsapp_provider,
    whatsapp_api_token: apiConfig?.whatsapp_api_token || defaultApiFormData.whatsapp_api_token,
    whatsapp_phone_number: apiConfig?.whatsapp_phone_number || defaultApiFormData.whatsapp_phone_number,
    whatsapp_gateway_url: apiConfig?.whatsapp_gateway_url || defaultApiFormData.whatsapp_gateway_url,
    whatsapp_linked_phone: apiConfig?.whatsapp_linked_phone || defaultApiFormData.whatsapp_linked_phone,
    twilio_account_sid: apiConfig?.twilio_account_sid || defaultApiFormData.twilio_account_sid,
    twilio_auth_token: apiConfig?.twilio_auth_token || defaultApiFormData.twilio_auth_token,
    twilio_whatsapp_number: apiConfig?.twilio_whatsapp_number || defaultApiFormData.twilio_whatsapp_number,
    sms_api_enabled: apiConfig?.sms_api_enabled || defaultApiFormData.sms_api_enabled,
    sms_api_key: apiConfig?.sms_api_key || defaultApiFormData.sms_api_key,
    email_provider: apiConfig?.email_provider || defaultApiFormData.email_provider,
    email_api_enabled: apiConfig?.email_api_enabled || defaultApiFormData.email_api_enabled,
    email_api_key: apiConfig?.email_api_key || defaultApiFormData.email_api_key,
    email_from_address: apiConfig?.email_from_address || defaultApiFormData.email_from_address,
    email_from_name: apiConfig?.email_from_name || defaultApiFormData.email_from_name,
    signwell_enabled: apiConfig?.signwell_enabled || defaultApiFormData.signwell_enabled,
    signwell_api_key: apiConfig?.signwell_api_key || defaultApiFormData.signwell_api_key,
  }), [apiConfig]);

  React.useEffect(() => {
    const syncKey = JSON.stringify(nextUiFormData);
    if (lastUiSyncKeyRef.current === syncKey) return;

    setUiFormData((prev) => (hasUiChanges(prev, nextUiFormData) ? nextUiFormData : prev));
    lastUiSyncKeyRef.current = syncKey;
  }, [nextUiFormData]);

  React.useEffect(() => {
    const syncKey = JSON.stringify(nextApiFormData);
    if (lastApiSyncKeyRef.current === syncKey) return;

    setApiFormData((prev) => (hasApiChanges(prev, nextApiFormData) ? nextApiFormData : prev));
    lastApiSyncKeyRef.current = syncKey;
  }, [nextApiFormData]);

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
    if (provider === 'qr_session') {
      return {
        connected: !!apiFormData.whatsapp_gateway_url && !!apiFormData.whatsapp_linked_phone,
        label: 'Sesión QR',
      };
    }
    return { connected: true, label: 'wa.me (Manual)' };
  };

  const providerStatus = getProviderStatus();
  const webhookUrl = getWhatsAppWebhookUrl();

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
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="signwell" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Firma Digital
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Meta Business API */}
                  <div
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.whatsapp_provider === 'meta' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => handleApiInputChange('whatsapp_provider', 'meta')}
                  >
                    <div className="font-medium">Meta Business API</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      API oficial de WhatsApp. Requiere cuenta Business verificada.
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
                      Sandbox o número verificado. Fácil de configurar.
                    </p>
                    {apiFormData.whatsapp_provider === 'twilio' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* QR Session Gateway */}
                  <div
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.whatsapp_provider === 'qr_session' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => handleApiInputChange('whatsapp_provider', 'qr_session')}
                  >
                    <div className="font-medium flex items-center gap-1">
                      Sesión QR
                      <Badge variant="secondary" className="text-[10px]">Gateway</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vincula tu número escaneando QR. Usa whatsapp-web.js o Baileys como gateway.
                    </p>
                    {apiFormData.whatsapp_provider === 'qr_session' && (
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
                      Abre WhatsApp Web con mensaje pre-cargado. No requiere API.
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

              {/* QR Session Gateway Fields */}
              {apiFormData.whatsapp_provider === 'qr_session' && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Gateway WhatsApp con Sesión QR
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Conecta un servidor gateway (whatsapp-web.js, Baileys, WPPConnect) que expone una API HTTP.
                    El admin escanea el QR desde el gateway y el número queda vinculado para envío automático.
                  </p>
                  <div>
                    <Label htmlFor="gateway_url">URL del Gateway</Label>
                    <Input
                      id="gateway_url"
                      value={apiFormData.whatsapp_gateway_url}
                      onChange={(e) => handleApiInputChange('whatsapp_gateway_url', e.target.value)}
                      placeholder="https://mi-gateway.example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Endpoint base del servidor gateway. Ej: POST /send-otp
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="linked_phone">Número Vinculado (QR)</Label>
                    <Input
                      id="linked_phone"
                      value={apiFormData.whatsapp_linked_phone}
                      onChange={(e) => handleApiInputChange('whatsapp_linked_phone', e.target.value)}
                      placeholder="+5959XXXXXXX"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Número que escaneó el QR y queda como remitente de los mensajes OTP.
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
                    <p className="font-medium">Flujo de vinculación:</p>
                    <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                      <li>Despliega el gateway en tu servidor (whatsapp-web.js / Baileys)</li>
                      <li>Accede a la interfaz del gateway y escanea el QR con tu WhatsApp</li>
                      <li>Copia la URL del gateway y el número vinculado aquí</li>
                      <li>El sistema enviará OTP automáticamente por este número</li>
                    </ol>
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

              {(apiFormData.whatsapp_provider === 'meta' || apiFormData.whatsapp_provider === 'twilio') && (
                <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
                  <Label className="text-sm font-medium">URL de Webhook</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(webhookUrl);
                          toast.success('Webhook URL copiada');
                        } catch {
                          toast.error('No se pudo copiar la URL');
                        }
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usa esta URL en Meta/Twilio para recibir estados de entrega y lectura.
                  </p>
                </div>
              )}

              {/* WhatsApp Test Button */}
              {apiFormData.whatsapp_provider !== 'wame_fallback' && (
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Probar WhatsApp
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+5959XXXXXXX (número de prueba)"
                      value={whatsappTestPhone}
                      onChange={(e) => setWhatsappTestPhone(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={whatsappTesting || !whatsappTestPhone}
                      onClick={async () => {
                        setWhatsappTesting(true);
                        try {
                          // Save config first
                          handleApiSave();
                          // Wait a moment for save
                          await new Promise(r => setTimeout(r, 1000));
                          const { data, error } = await supabase.functions.invoke('signature-otp', {
                            body: {
                              action: 'test_whatsapp',
                              test_phone: whatsappTestPhone,
                              company_id: profile?.company_id,
                            },
                          });
                          if (error) throw error;
                          if (data?.success) {
                            toast.success(data.message || 'WhatsApp de prueba enviado');
                          } else {
                            toast.error(data?.error || data?.message || 'Error al enviar prueba');
                          }
                        } catch (err: any) {
                          toast.error(err.message || 'Error al probar WhatsApp');
                        } finally {
                          setWhatsappTesting(false);
                        }
                      }}
                    >
                      {whatsappTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar prueba'}
                    </Button>
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
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  SMS no está implementado actualmente. Se requiere un proveedor externo (Twilio SMS, etc.) para habilitar este canal.
                </AlertDescription>
              </Alert>
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
                <div className="space-y-4">
                  {/* Email Provider Selector */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Proveedor de Email</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.email_provider === 'resend' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => handleApiInputChange('email_provider', 'resend')}
                      >
                        <div className="font-medium flex items-center gap-1">
                          Resend API
                          <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Servicio cloud de email transaccional. Solo necesitas API Key.
                        </p>
                        {apiFormData.email_provider === 'resend' && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${apiFormData.email_provider === 'smtp' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => handleApiInputChange('email_provider', 'smtp')}
                      >
                        <div className="font-medium flex items-center gap-1">
                          SMTP Propio
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Office 365, iRedMail u otro servidor SMTP con credenciales propias.
                        </p>
                        {apiFormData.email_provider === 'smtp' && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resend Fields */}
                  {apiFormData.email_provider === 'resend' && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                      <div>
                        <Label htmlFor="email_key">API Key (Resend)</Label>
                        <Input id="email_key" type="password" value={apiFormData.email_api_key} onChange={(e) => handleApiInputChange('email_api_key', e.target.value)} placeholder="re_xxxxxxxx..." />
                      </div>
                      <div>
                        <Label htmlFor="email_from">Email Remitente</Label>
                        <Input id="email_from" value={apiFormData.email_from_address} onChange={(e) => handleApiInputChange('email_from_address', e.target.value)} placeholder="noreply@tuempresa.com" />
                      </div>
                    </div>
                  )}

                  {/* SMTP Fields */}
                  {apiFormData.email_provider === 'smtp' && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        La configuración SMTP detallada (host, puerto, TLS, credenciales) se administra desde el panel de <strong>Política OTP para Firma</strong> más abajo, en la sección "SMTP Propio".
                        Activa el canal SMTP en la política OTP para configurar los datos del servidor.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email_from_smtp">Email Remitente</Label>
                          <Input id="email_from_smtp" value={apiFormData.email_from_address} onChange={(e) => handleApiInputChange('email_from_address', e.target.value)} placeholder="noreply@tuempresa.com" />
                        </div>
                        <div>
                          <Label htmlFor="email_name_smtp">Nombre Remitente</Label>
                          <Input id="email_name_smtp" value={apiFormData.email_from_name} onChange={(e) => handleApiInputChange('email_from_name', e.target.value)} placeholder="Mi Empresa" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SignWell / Firma Digital Tab */}
        <TabsContent value="signwell" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  Firma Digital - SignWell
                  {apiFormData.signwell_enabled && apiFormData.signwell_api_key ? (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Deshabilitado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Firma electrónica con validez legal via SignWell. Cuando está habilitado, los clientes firman documentos via SignWell en lugar del canvas manual.
                </CardDescription>
              </div>
              <Button onClick={handleApiSave} disabled={apiUpdating}>
                {apiUpdating ? 'Guardando...' : 'Guardar'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="signwell_enabled"
                  checked={apiFormData.signwell_enabled}
                  onCheckedChange={(checked) => handleApiInputChange('signwell_enabled', checked)}
                />
                <Label htmlFor="signwell_enabled">Habilitar firma electrónica SignWell</Label>
              </div>

              {apiFormData.signwell_enabled && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <div>
                    <Label htmlFor="signwell_api_key">API Key de SignWell</Label>
                    <Input
                      id="signwell_api_key"
                      type="password"
                      value={apiFormData.signwell_api_key}
                      onChange={(e) => handleApiInputChange('signwell_api_key', e.target.value)}
                      placeholder="Tu API Key de SignWell"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Obtén tu API key en signwell.com &gt; Settings &gt; API
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={async () => {
                      setSignwellTesting(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('signwell-proxy', {
                          body: { action: 'test_connection' },
                        });
                        if (error) throw error;
                        if (data?.success) {
                          toast.success('Conexión exitosa con SignWell');
                        } else {
                          toast.error(data?.error || 'No se pudo conectar con SignWell');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Error al probar conexión');
                      } finally {
                        setSignwellTesting(false);
                      }
                    }}
                    disabled={!apiFormData.signwell_api_key || signwellTesting}
                  >
                    {signwellTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Probando...
                      </>
                    ) : (
                      'Probar conexión'
                    )}
                  </Button>
                </div>
              )}

              <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <h4 className="font-medium">Pricing de SignWell</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>- Plan gratuito: 1 documento/mes</p>
                  <p>- Plan Personal: $8/mes - 25 documentos</p>
                  <p>- Plan Business: $24/mes - documentos ilimitados</p>
                  <p>- API: $0.75 por documento (pay-as-you-go)</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <h4 className="font-medium">Comportamiento</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Habilitado:</strong> Al generar un enlace de firma, se crea un documento en SignWell y el cliente firma via la plataforma de SignWell (iframe integrado).</p>
                  <p><strong>Deshabilitado:</strong> El sistema usa la firma por canvas manual (comportamiento actual).</p>
                  <p><strong>Fallback:</strong> Si falla la creación en SignWell, el sistema vuelve al canvas automáticamente.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
