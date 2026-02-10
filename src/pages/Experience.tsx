
import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Smartphone, Palette, Wifi, Monitor, Globe, Bell, Upload, Trash2 } from 'lucide-react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

export default function Experience() {
  const { configuration, isLoading, updateConfiguration, isUpdating } = useCompanyConfiguration();
  const { profile } = useSimpleAuthContext();

  const [primaryColor, setPrimaryColor] = useState('#1e3a5f');
  const [secondaryColor, setSecondaryColor] = useState('#334155');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [logoUrl, setLogoUrl] = useState('');
  const [loginLogoUrl, setLoginLogoUrl] = useState('');
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Sync form with loaded configuration
  useEffect(() => {
    if (configuration) {
      const cfg = configuration as any;
      setPrimaryColor(cfg.primary_color || '#1e3a5f');
      setSecondaryColor(cfg.secondary_color || '#334155');
      setAccentColor(cfg.accent_color || '#3b82f6');
      setLogoUrl(cfg.logo_url || '');
      setLoginLogoUrl(cfg.login_logo_url || '');
      setLoginBackgroundUrl(cfg.login_background_url || '');
    }
  }, [configuration]);

  const uploadFile = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void
  ) => {
    if (!profile?.company_id) {
      toast.error('No se encontró la empresa del usuario');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${profile.company_id}/${folder}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      setUrl(publicUrl);
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBranding = () => {
    if (!profile?.company_id) {
      toast.error('No se encontró la empresa del usuario');
      return;
    }

    updateConfiguration({
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      logo_url: logoUrl || null,
      login_logo_url: loginLogoUrl || null,
      login_background_url: loginBackgroundUrl || null,
    } as any);

    // Persist to localStorage for login page (pre-auth access)
    try {
      localStorage.setItem('samap_branding_logo', loginLogoUrl || logoUrl || '');
      localStorage.setItem('samap_branding_name', configuration?.name || 'SAMAP Digital');
    } catch { /* ignore */ }

    // Apply CSS variables immediately
    const root = document.documentElement;
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    root.style.setProperty('--primary', hexToHsl(primaryColor));
    root.style.setProperty('--secondary', hexToHsl(secondaryColor));
    root.style.setProperty('--accent', hexToHsl(accentColor));
  };

  const handleResetColors = () => {
    setPrimaryColor('#1e3a5f');
    setSecondaryColor('#334155');
    setAccentColor('#3b82f6');
  };

  if (isLoading) {
    return (
      <Layout title="Experiencia" description="Gestión de UX, móvil y branding">
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Experiencia" description="Gestión de UX, móvil y branding">
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Móvil
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Offline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          {/* Colores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colores de la Marca
              </CardTitle>
              <CardDescription>
                Personaliza los colores principales de tu sistema. Los cambios se aplican en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1e3a5f"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Botones, links, encabezados</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#334155"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Fondos secundarios, badges</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Color de Acento</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Destacados, iconos activos</p>
                </div>
              </div>

              {/* Vista previa de colores */}
              <div className="p-4 border rounded-lg space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Vista previa</p>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border" style={{ backgroundColor: primaryColor }} />
                    <span className="text-sm">Primario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border" style={{ backgroundColor: secondaryColor }} />
                    <span className="text-sm">Secundario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border" style={{ backgroundColor: accentColor }} />
                    <span className="text-sm">Acento</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" style={{ backgroundColor: primaryColor, color: 'white' }}>
                    Botón primario
                  </Button>
                  <Button size="sm" variant="outline" style={{ borderColor: primaryColor, color: primaryColor }}>
                    Botón outline
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleResetColors}>
                  Restablecer colores
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Imágenes / Logos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logos e Imágenes
              </CardTitle>
              <CardDescription>
                Sube el logo de tu empresa y personaliza la pantalla de login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo del sidebar/menú */}
                <div className="space-y-3">
                  <Label>Logo del Menú (sidebar)</Label>
                  {logoUrl && (
                    <div className="relative w-full h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setLogoUrl('')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file, 'logo', setUploadingLogo, setLogoUrl);
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? 'Subiendo...' : 'Subir logo del menú'}
                  </Button>
                </div>

                {/* Logo del login */}
                <div className="space-y-3">
                  <Label>Logo del Login</Label>
                  {loginLogoUrl && (
                    <div className="relative w-full h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={loginLogoUrl} alt="Login Logo" className="max-h-16 max-w-full object-contain" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setLoginLogoUrl('')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <input
                    ref={loginLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file, 'login-logo', setUploadingLoginLogo, setLoginLogoUrl);
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploadingLoginLogo}
                    onClick={() => loginLogoInputRef.current?.click()}
                  >
                    {uploadingLoginLogo ? 'Subiendo...' : 'Subir logo del login'}
                  </Button>
                </div>

                {/* Fondo del login */}
                <div className="space-y-3">
                  <Label>Fondo del Login</Label>
                  {loginBackgroundUrl && (
                    <div className="relative w-full h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={loginBackgroundUrl} alt="Background" className="h-full w-full object-cover" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setLoginBackgroundUrl('')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file, 'login-bg', setUploadingBackground, setLoginBackgroundUrl);
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploadingBackground}
                    onClick={() => backgroundInputRef.current?.click()}
                  >
                    {uploadingBackground ? 'Subiendo...' : 'Subir fondo del login'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botón Guardar */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSaveBranding}
              disabled={isUpdating}
            >
              {isUpdating ? 'Guardando...' : 'Guardar configuración de marca'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Configuración Móvil
              </CardTitle>
              <CardDescription>
                Optimización para dispositivos móviles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Responsive Design
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="mobile-optimized" defaultChecked />
                      <Label htmlFor="mobile-optimized">Optimización móvil habilitada</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="touch-friendly" defaultChecked />
                      <Label htmlFor="touch-friendly">Interfaz táctil mejorada</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="swipe-gestures" />
                      <Label htmlFor="swipe-gestures">Gestos de deslizar</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificaciones Push
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="push-notifications" />
                      <Label htmlFor="push-notifications">Notificaciones push</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="email-notifications" defaultChecked />
                      <Label htmlFor="email-notifications">Notificaciones por email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="sms-notifications" />
                      <Label htmlFor="sms-notifications">Notificaciones SMS</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Funcionalidad Offline
              </CardTitle>
              <CardDescription>
                Configuración para trabajar sin conexión a internet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Estado de Conexión
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 dark:text-green-400 font-medium">Conectado</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                        Todas las funciones están disponibles
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Funciones disponibles offline:</Label>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>Visualización de datos guardados</li>
                        <li>Edición de documentos</li>
                        <li>Crear nuevas ventas (se sincroniza al reconectar)</li>
                        <li>Firmas digitales</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configuración</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="offline-mode" defaultChecked />
                      <Label htmlFor="offline-mode">Modo offline habilitado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-sync" defaultChecked />
                      <Label htmlFor="auto-sync">Sincronización automática</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="cache-documents" defaultChecked />
                      <Label htmlFor="cache-documents">Cachear documentos</Label>
                    </div>

                    <div className="pt-4">
                      <Button variant="outline" className="w-full">
                        Sincronizar Ahora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
