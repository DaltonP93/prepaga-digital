
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompanySettings, useCompanyBranding } from '@/hooks/useCompanySettings';
import { useAuthContext } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Palette, MessageSquare } from 'lucide-react';

export const AdminConfigPanel = () => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState('general');
  
  // Obtener ID de empresa del usuario actual
  const companyId = user?.user_metadata?.company_id;
  const { settings, updateSettings, isUpdating } = useCompanySettings(companyId);
  const { data: branding } = useCompanyBranding(companyId);

  const [formData, setFormData] = useState({
    // API Keys
    whatsapp_api_key: '',
    sms_api_key: '',
    email_api_key: '',
    resend_api_key: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    
    // Branding
    login_title: 'Seguro Digital',
    login_subtitle: 'Sistema de Firma Digital',
    login_background_url: '',
    login_logo_url: '',
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    accent_color: '#4ade80',
  });

  // Cargar datos existentes
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        whatsapp_api_key: settings.whatsapp_api_key || '',
        sms_api_key: settings.sms_api_key || '',
        email_api_key: settings.email_api_key || '',
        resend_api_key: settings.resend_api_key || '',
        twilio_account_sid: settings.twilio_account_sid || '',
        twilio_auth_token: settings.twilio_auth_token || '',
      }));
    }
  }, [settings]);

  useEffect(() => {
    if (branding) {
      setFormData(prev => ({
        ...prev,
        login_title: branding.login_title || 'Seguro Digital',
        login_subtitle: branding.login_subtitle || 'Sistema de Firma Digital',
        login_background_url: branding.login_background_url || '',
        login_logo_url: branding.login_logo_url || '',
        primary_color: branding.primary_color || '#667eea',
        secondary_color: branding.secondary_color || '#764ba2',
        accent_color: branding.accent_color || '#4ade80',
      }));
    }
  }, [branding]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAPIKeys = () => {
    updateSettings({
      whatsapp_api_key: formData.whatsapp_api_key,
      sms_api_key: formData.sms_api_key,
      email_api_key: formData.email_api_key,
      resend_api_key: formData.resend_api_key,
      twilio_account_sid: formData.twilio_account_sid,
      twilio_auth_token: formData.twilio_auth_token,
    });
  };

  const handleSaveBranding = async () => {
    try {
      // Actualizar configuración de empresa (branding)
      const { error } = await supabase
        .from('companies')
        .update({
          login_title: formData.login_title,
          login_subtitle: formData.login_subtitle,
          login_background_url: formData.login_background_url,
          login_logo_url: formData.login_logo_url,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
        })
        .eq('id', companyId);

      if (error) throw error;

      toast.success("Branding actualizado correctamente");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configuración de Empresa
        </h1>
        <p className="text-muted-foreground">
          Administra las configuraciones y personalizaciones de tu empresa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Integraciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Configuraciones básicas de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="login-title">Título del Login</Label>
                  <Input
                    id="login-title"
                    value={formData.login_title}
                    onChange={(e) => handleInputChange('login_title', e.target.value)}
                    placeholder="Seguro Digital"
                  />
                </div>
                <div>
                  <Label htmlFor="login-subtitle">Subtítulo del Login</Label>
                  <Input
                    id="login-subtitle"
                    value={formData.login_subtitle}
                    onChange={(e) => handleInputChange('login_subtitle', e.target.value)}
                    placeholder="Sistema de Firma Digital"
                  />
                </div>
              </div>
              <Button onClick={handleSaveBranding} disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Personalización de Marca</CardTitle>
              <CardDescription>
                Personaliza la apariencia de tu sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo-url">URL del Logo</Label>
                  <Input
                    id="logo-url"
                    value={formData.login_logo_url}
                    onChange={(e) => handleInputChange('login_logo_url', e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="background-url">URL de Fondo</Label>
                  <Input
                    id="background-url"
                    value={formData.login_background_url}
                    onChange={(e) => handleInputChange('login_background_url', e.target.value)}
                    placeholder="https://ejemplo.com/fondo.jpg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primary-color">Color Primario</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="secondary-color">Color Secundario</Label>
                  <Input
                    id="secondary-color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="accent-color">Color de Acento</Label>
                  <Input
                    id="accent-color"
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveBranding} disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar Branding'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integraciones de API</CardTitle>
              <CardDescription>
                Configura las API keys para servicios externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="whatsapp-key">WhatsApp API Key</Label>
                  <Input
                    id="whatsapp-key"
                    type="password"
                    value={formData.whatsapp_api_key}
                    onChange={(e) => handleInputChange('whatsapp_api_key', e.target.value)}
                    placeholder="••••••••••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="sms-key">SMS API Key</Label>
                  <Input
                    id="sms-key"
                    type="password"
                    value={formData.sms_api_key}
                    onChange={(e) => handleInputChange('sms_api_key', e.target.value)}
                    placeholder="••••••••••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="resend-key">Resend API Key</Label>
                  <Input
                    id="resend-key"
                    type="password"
                    value={formData.resend_api_key}
                    onChange={(e) => handleInputChange('resend_api_key', e.target.value)}
                    placeholder="••••••••••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="twilio-sid">Twilio Account SID</Label>
                  <Input
                    id="twilio-sid"
                    type="password"
                    value={formData.twilio_account_sid}
                    onChange={(e) => handleInputChange('twilio_account_sid', e.target.value)}
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveAPIKeys} disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar API Keys'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
