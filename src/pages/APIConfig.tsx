
import { Layout } from "@/components/Layout";
import { APIConfigPanel } from "@/components/APIConfigPanel";

const APIConfig = () => {
  return (
    <Layout 
      title="Configuración API" 
      description="Gestionar claves API y configuraciones de integración"
    >
      <APIConfigPanel />
    </Layout>
  );
};

export default APIConfig;
