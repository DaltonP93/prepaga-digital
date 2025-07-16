import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';
import ReportsManager from '@/components/ReportsManager';

const Analytics = () => {
  return (
    <Layout 
      title="Analytics & Reportes" 
      description="Análisis avanzado de datos y generación de reportes"
    >
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Análisis Avanzado</TabsTrigger>
          <TabsTrigger value="reports">Gestión de Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AdvancedAnalytics />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsManager />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Analytics;