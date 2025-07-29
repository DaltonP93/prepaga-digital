
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/useSales";
import { SaleForm } from "@/components/SaleForm";

export default function SaleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sales, isLoading, error } = useSales();

  const sale = sales?.find(s => s.id === id);

  if (isLoading) {
    return (
      <Layout title="Cargando..." description="Cargando datos de la venta">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Cargando venta...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !sale) {
    return (
      <Layout title="Error" description="No se pudo cargar la venta">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la venta solicitada.
            </p>
            <Button onClick={() => navigate('/sales')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Ventas
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editar Venta" description="Modifica los datos de la venta">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Editar Venta</h1>
            <p className="text-muted-foreground">
              Modifica los datos de la venta seleccionada
            </p>
          </div>
          <Button onClick={() => navigate('/sales')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Ventas
          </Button>
        </div>

        <SaleForm 
          open={true} 
          onOpenChange={(open) => !open && navigate('/sales')}
          sale={sale}
        />
      </div>
    </Layout>
  );
}
