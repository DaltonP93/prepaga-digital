import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BrandingManager from '@/components/BrandingManager';
import MobileFeatures from '@/components/MobileFeatures';
import { Smartphone, Palette, Wifi } from 'lucide-react';

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
          <BrandingManager />
        </TabsContent>
        
        <TabsContent value="mobile" className="space-y-4">
          <MobileFeatures />
        </TabsContent>
        
        <TabsContent value="offline" className="space-y-4">
          <div className="text-center py-8">
            <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Modo Offline</h3>
            <p className="text-muted-foreground">
              La funcionalidad offline está integrada automáticamente. 
              Los datos se sincronizan cuando vuelves a tener conexión.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}