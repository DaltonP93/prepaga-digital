
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/useSales";
import { Layout } from "@/components/Layout";
import SaleTabbedForm from "@/components/sale-form/SaleTabbedForm";

export default function SaleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sales, isLoading, error } = useSales();

  const sale = sales?.find(s => s.id === id);

  if (isLoading) {
    return (
      <Layout title="Editar Venta" description="Cargando...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !sale) {
    return (
      <Layout title="Error" description="Venta no encontrada">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">No se pudo cargar la venta solicitada.</p>
            <Button onClick={() => navigate('/sales')} variant="outline">Volver a Ventas</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editar Venta" description="Modificar datos de la venta">
      <SaleTabbedForm sale={sale} />
    </Layout>
  );
}
