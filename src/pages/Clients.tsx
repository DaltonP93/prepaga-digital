
import { ClientsList } from '@/components/ClientsList';

const Clients = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Gestión de clientes del sistema
        </p>
      </div>
      <ClientsList />
    </div>
  );
};

export default Clients;
