
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Palette, Type, Image as ImageIcon } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BrandingFormData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  companyName: string;
  logoUrl: string;
  favicon: string;
  customCSS: string;
  darkMode: boolean;
  fontFamily: string;
  borderRadius: string;
  shadows: boolean;
}

export function CompanyBrandingForm() {
  const { branding, updateBranding, resetBranding } = useBranding();
  const [uploading, setUploading] = useState<{ logo: boolean; favicon: boolean }>({
    logo: false,
    favicon: false
  });

  const { register, handleSubmit, setValue, watch, reset } = useForm<BrandingFormData>({
    defaultValues: branding,
    values: branding
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'favicon'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [type]: true }));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `company/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setValue(type === 'logo' ? 'logoUrl' : 'favicon', publicUrl);
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} subido correctamente`);
    } catch (error: any) {
      toast.error(`Error al subir ${type}: ` + error.message);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const onSubmit = async (data: BrandingFormData) => {
    try {
      await updateBranding(data);
      toast.success('Configuración de marca actualizada');
    } catch (error: any) {
      toast.error('Error al actualizar: ' + error.message);
    }
  };

  const handleReset = async () => {
    try {
      await resetBranding();
      reset();
      toast.success('Configuración restablecida a valores por defecto');
    } catch (error: any) {
      toast.error('Error al restablecer: ' + error.message);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Configuración de Marca
        </CardTitle>
        <CardDescription>
          Personaliza la apariencia de tu empresa en el sistema
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="colors">Colores</TabsTrigger>
              <TabsTrigger value="typography">Tipografía</TabsTrigger>
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  {...register("companyName")}
                  placeholder="Nombre de tu empresa"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo de la Empresa</Label>
                  <div className="flex items-center space-x-4">
                    {watch("logoUrl") && (
                      <img 
                        src={watch("logoUrl")} 
                        alt="Logo" 
                        className="w-16 h-16 object-contain border rounded"
                      />
                    )}
                    <div>
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 bg-secondary px-3 py-2 rounded-md hover:bg-secondary/80">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">
                            {uploading.logo ? "Subiendo..." : "Subir Logo"}
                          </span>
                        </div>
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        className="hidden"
                        disabled={uploading.logo}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center space-x-4">
                    {watch("favicon") && (
                      <img 
                        src={watch("favicon")} 
                        alt="Favicon" 
                        className="w-8 h-8 object-contain border rounded"
                      />
                    )}
                    <div>
                      <Label htmlFor="favicon-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 bg-secondary px-3 py-2 rounded-md hover:bg-secondary/80">
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-sm">
                            {uploading.favicon ? "Subiendo..." : "Subir Favicon"}
                          </span>
                        </div>
                      </Label>
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'favicon')}
                        className="hidden"
                        disabled={uploading.favicon}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Color Primario</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      {...register("primaryColor")}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <Input
                      value={watch("primaryColor")}
                      onChange={(e) => setValue("primaryColor", e.target.value)}
                      placeholder="#667eea"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Color Secundario</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      {...register("secondaryColor")}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <Input
                      value={watch("secondaryColor")}
                      onChange={(e) => setValue("secondaryColor", e.target.value)}
                      placeholder="#764ba2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Color de Acento</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      {...register("accentColor")}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <Input
                      value={watch("accentColor")}
                      onChange={(e) => setValue("accentColor", e.target.value)}
                      placeholder="#4ade80"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Modo Oscuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Activar tema oscuro por defecto
                  </p>
                </div>
                <Switch
                  checked={watch("darkMode")}
                  onCheckedChange={(checked) => setValue("darkMode", checked)}
                />
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Familia de Fuente</Label>
                <Input
                  id="fontFamily"
                  {...register("fontFamily")}
                  placeholder="Inter, sans-serif"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="borderRadius">Radio de Bordes</Label>
                <Input
                  id="borderRadius"
                  {...register("borderRadius")}
                  placeholder="0.5rem"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Sombras</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar sombras en los componentes
                  </p>
                </div>
                <Switch
                  checked={watch("shadows")}
                  onCheckedChange={(checked) => setValue("shadows", checked)}
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customCSS">CSS Personalizado</Label>
                <Textarea
                  id="customCSS"
                  {...register("customCSS")}
                  placeholder="/* CSS personalizado aquí */"
                  className="font-mono text-sm"
                  rows={10}
                />
                <p className="text-sm text-muted-foreground">
                  Agrega CSS personalizado para mayor control sobre el diseño
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Restablecer
            </Button>
            
            <div className="space-x-2">
              <Button type="submit">
                Guardar Cambios
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
