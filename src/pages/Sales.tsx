
import { Layout } from "@/components/Layout";
import { ClientsList } from "@/components/ClientsList";

const Sales = () => {
  return (
    <Layout 
      title="Gestión de Ventas" 
      description="Proceso de ventas y seguimiento"
    >
      <ClientsList />
    </Layout>
  );
};

export default Sales;
