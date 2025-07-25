
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SaleForm } from "@/components/SaleForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SaleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      if (!id) throw new Error('Sale ID is required');
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando venta...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    );
  }

  return (
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
  );
}
