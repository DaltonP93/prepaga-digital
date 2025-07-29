
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Eye, 
  Edit3, 
  Trash2,
  FileText, 
  Send, 
  PenTool,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import { SaleForm } from "@/components/SaleForm";
import { useSales, useDeleteSale, useGenerateQuestionnaireLink, useGenerateSignatureLink } from "@/hooks/useSales";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

type Sale = Database['public']['Tables']['sales']['Row'];

const Sales = () => {
  const navigate = useNavigate();
  const { data: sales = [], isLoading } = useSales();
  const deleteSale = useDeleteSale();
  const generateQuestionnaireLink = useGenerateQuestionnaireLink();
  const generateSignatureLink = useGenerateSignatureLink();
  const { profile } = useSimpleAuthContext();
  
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'firmado': return 'default';
      case 'enviado': return 'secondary';
      case 'borrador': return 'outline';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'firmado': return <CheckCircle2 className="w-3 h-3" />;
      case 'enviado': return <Send className="w-3 h-3" />;
      case 'borrador': return <Clock className="w-3 h-3" />;
      case 'cancelado': return <XCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'firmado': return 'Firmado';
      case 'enviado': return 'Enviado';
      case 'borrador': return 'Borrador';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleDeleteSale = async (saleId: string) => {
    await deleteSale.mutateAsync(saleId);
  };

  const handleCloseForm = () => {
    setShowSaleForm(false);
    setEditingSale(null);
  };

  const handleGenerateQuestionnaireLink = async (saleId: string) => {
    await generateQuestionnaireLink.mutateAsync(saleId);
  };

  const handleGenerateSignatureLink = async (saleId: string) => {
    await generateSignatureLink.mutateAsync(saleId);
  };

  const canDeleteSale = (sale: Sale) => {
    // Solo super_admin y admin pueden eliminar, y solo si la venta está en borrador
    return ['super_admin', 'admin'].includes(profile?.role || '') && sale.status === 'borrador';
  };

  if (isLoading) {
    return (
      <Layout title="Gestión de Ventas" description="Administrar ventas y contratos del sistema">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Gestión de Ventas" 
      description="Administrar ventas y contratos del sistema"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
            <p className="text-muted-foreground">
              Gestiona las ventas y contratos del sistema
            </p>
          </div>
          <Button onClick={() => navigate('/sales/new')}>
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
                      ${Number(sale.total_amount).toLocaleString('es-PY')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sale.status)} className="gap-1">
                        {getStatusIcon(sale.status)}
                        {getStatusLabel(sale.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.created_at ? format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es }) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSale(sale)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        
                        {sale.template_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateQuestionnaireLink(sale.id)}
                            disabled={generateQuestionnaireLink.isPending}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateSignatureLink(sale.id)}
                          disabled={generateSignatureLink.isPending}
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>

                        {canDeleteSale(sale) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente la venta.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
