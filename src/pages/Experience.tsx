
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Smartphone, Palette, Wifi, Monitor, Globe, Bell } from 'lucide-react';

export default function Experience() {
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configuración de Marca
              </CardTitle>
              <CardDescription>
                Personaliza la apariencia de tu sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="primary-color">Color Primario</Label>
                    <Input
                      id="primary-color"
                      type="color"
                      defaultValue="#667eea"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary-color">Color Secundario</Label>
                    <Input
                      id="secondary-color"
                      type="color"
                      defaultValue="#764ba2"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accent-color">Color de Acento</Label>
                    <Input
                      id="accent-color"
                      type="color"
                      defaultValue="#4ade80"
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-logo">Logo de la Empresa</Label>
                    <Input
                      id="company-logo"
                      type="file"
                      accept="image/*"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-background">Fondo de Login</Label>
                    <Input
                      id="login-background"
                      type="file"
                      accept="image/*"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="dark-mode" />
                    <Label htmlFor="dark-mode">Modo Oscuro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="shadows" defaultChecked />
                    <Label htmlFor="shadows">Sombras</Label>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <Button>Guardar Configuración</Button>
              </div>
            </CardContent>
          </Card>
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
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 font-medium">Conectado</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Todas las funciones están disponibles
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Funciones disponibles offline:</Label>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Visualización de datos guardados</li>
                        <li>• Edición de documentos</li>
                        <li>• Crear nuevas ventas (se sincroniza al reconectar)</li>
                        <li>• Firmas digitales</li>
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
