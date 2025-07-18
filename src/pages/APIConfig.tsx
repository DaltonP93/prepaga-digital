
import { Layout } from "@/components/Layout";
import { APIConfigPanel } from "@/components/APIConfigPanel";

const APIConfig = () => {
  return (
    <Layout 
      title="Configuración API" 
      description="Gestionar integraciones de comunicación"
    >
      <APIConfigPanel />
    </Layout>
  );
};

export default APIConfig;
