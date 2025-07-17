
import { Layout } from "@/components/Layout";
import { CommunicationManager } from "@/components/CommunicationManager";

export default function Communications() {
  return (
    <Layout 
      title="Comunicaciones" 
      description="Gestiona las comunicaciones con clientes"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comunicaciones</h2>
          <p className="text-muted-foreground">
            Gestiona y visualiza todas las comunicaciones con clientes
          </p>
        </div>
        
        <CommunicationManager />
      </div>
    </Layout>
  );
}
