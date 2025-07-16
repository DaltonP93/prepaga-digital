import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/useBranding';
import { Palette, Type, Image, Code, Smartphone, Monitor, Paintbrush } from 'lucide-react';

export default function BrandingManager() {
  const { branding, loading, updateBranding, resetBranding } = useBranding();
  const [formData, setFormData] = useState(branding);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateBranding(formData);
      toast({
        title: "Branding actualizado",
        description: "Los cambios se han aplicado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el branding",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      await resetBranding();
      setFormData(branding);
      toast({
        title: "Branding restablecido",
        description: "Se ha vuelto a la configuración por defecto",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo restablecer el branding",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Branding</h1>
          <p className="text-muted-foreground">Personaliza la apariencia de tu aplicación</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Restablecer
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Colores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Colores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  placeholder="#667eea"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  placeholder="#764ba2"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Color de Acento</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) => handleInputChange('accentColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.accentColor}
                  onChange={(e) => handleInputChange('accentColor', e.target.value)}
                  placeholder="#4ade80"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipografía */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Tipografía
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Fuente</Label>
              <Select value={formData.fontFamily} onValueChange={(value) => handleInputChange('fontFamily', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                  <SelectItem value="Lato">Lato</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="borderRadius">Radio de Bordes</Label>
              <Select value={formData.borderRadius} onValueChange={(value) => handleInputChange('borderRadius', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar radio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin redondeo</SelectItem>
                  <SelectItem value="0.25rem">Pequeño</SelectItem>
                  <SelectItem value="0.5rem">Mediano</SelectItem>
                  <SelectItem value="0.75rem">Grande</SelectItem>
                  <SelectItem value="1rem">Extra grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="shadows"
                checked={formData.shadows}
                onCheckedChange={(checked) => handleInputChange('shadows', checked)}
              />
              <Label htmlFor="shadows">Habilitar sombras</Label>
            </div>
          </CardContent>
        </Card>

        {/* Imágenes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Imágenes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL del Logo</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon">URL del Favicon</Label>
              <Input
                id="favicon"
                value={formData.favicon}
                onChange={(e) => handleInputChange('favicon', e.target.value)}
                placeholder="https://ejemplo.com/favicon.ico"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Mi Empresa"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="darkMode"
                checked={formData.darkMode}
                onCheckedChange={(checked) => handleInputChange('darkMode', checked)}
              />
              <Label htmlFor="darkMode">Modo oscuro por defecto</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Funciones móviles</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Cámara
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Notificaciones
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Paintbrush className="h-3 w-3" />
                  Modo offline
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSS Personalizado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            CSS Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="customCSS">CSS Personalizado</Label>
            <Textarea
              id="customCSS"
              value={formData.customCSS}
              onChange={(e) => handleInputChange('customCSS', e.target.value)}
              placeholder="/* Agrega tu CSS personalizado aquí */"
              className="min-h-[120px] font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vista previa */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg" style={{ 
              backgroundColor: formData.primaryColor + '20',
              borderColor: formData.primaryColor 
            }}>
              <h3 className="font-semibold" style={{ color: formData.primaryColor }}>
                {formData.companyName}
              </h3>
              <p className="text-sm text-muted-foreground">
                Esta es una vista previa de cómo se verá tu branding
              </p>
              <Button 
                className="mt-2"
                style={{ 
                  backgroundColor: formData.primaryColor,
                  color: 'white'
                }}
              >
                Botón de ejemplo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}