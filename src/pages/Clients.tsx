
import { Layout } from '@/components/Layout';
import { ClientsList } from '@/components/ClientsList';

const Clients = () => {
  return (
    <Layout title="Clientes" description="Gestión de clientes del sistema">
      <ClientsList />
    </Layout>
  );
};

export default Clients;
