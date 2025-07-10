
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Link, Eye, FileText } from "lucide-react";
import { SaleForm } from "@/components/SaleForm";
import { useSales, useGenerateSignatureLink } from "@/hooks/useSales";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Sale = Database['public']['Tables']['sales']['Row'] & {
  clients?: { first_name: string; last_name: string; email: string; phone: string };
  plans?: { name: string; price: number };
  salesperson?: { first_name: string; last_name: string };
  companies?: { name: string };
};

const Sales = () => {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const { data: sales = [], isLoading } = useSales();
  const generateSignatureLink = useGenerateSignatureLink();
  const { toast } = useToast();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completado': return 'default';
      case 'firmado': return 'secondary';
      case 'enviado': return 'outline';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'borrador': return 'Borrador';
      case 'enviado': return 'Enviado';
      case 'firmado': return 'Firmado';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleGenerateSignatureLink = async (sale: Sale) => {
    try {
      const result = await generateSignatureLink.mutateAsync(sale.id);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(result.signatureUrl);
      
      toast({
        title: "Enlace generado",
        description: "El enlace de firma ha sido copiado al portapapeles.",
      });
    } catch (error) {
      console.error('Error generating signature link:', error);
    }
  };

  const handleCloseForm = () => {
    setShowSaleForm(false);
    setEditingSale(null);
  };

  if (isLoading) {
    return (
      <Layout title="Gestión de Ventas" description="Administrar ventas y contratos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Gestión de Ventas" 
      description="Administrar ventas y contratos"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
            <p className="text-muted-foreground">
              Gestiona las ventas y el proceso de firmas
            </p>
          </div>
          <Button onClick={() => setShowSaleForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Ventas</CardTitle>
            <CardDescription>
              {sales.length} venta{sales.length !== 1 ? 's' : ''} registrada{sales.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}
                    </TableCell>
                    <TableCell>
                      {sale.plans?.name || 'Sin plan'}
                    </TableCell>
                    <TableCell>
                      ${sale.total_amount || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sale.status || 'borrador')}>
                        {getStatusLabel(sale.status || 'borrador')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.salesperson ? `${sale.salesperson.first_name} ${sale.salesperson.last_name}` : 'Sin vendedor'}
                    </TableCell>
                    <TableCell>
                      {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSale(sale)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        {sale.status === 'borrador' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSignatureLink(sale)}
                            disabled={generateSignatureLink.isPending}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {sale.signature_token && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/signature/${sale.signature_token}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {sales.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay ventas registradas</p>
              </div>
            )}
          </CardContent>
        </Card>

        <SaleForm
          open={showSaleForm}
          onOpenChange={handleCloseForm}
          sale={editingSale}
        />
      </div>
    </Layout>
  );
};

export default Sales;
