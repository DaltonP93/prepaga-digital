
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuditProcesses, useUpdateSaleStatus } from '@/hooks/useSimpleAuditProcess';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const SimpleAuditDashboard = () => {
  const { data: sales, isLoading } = useAuditProcesses();
  const updateSaleStatus = useUpdateSaleStatus();

  const handleApprove = (saleId: string) => {
    updateSaleStatus.mutate({
      saleId,
      status: 'completado',
      notes: 'Aprobado por auditor'
    });
  };

  const handleReject = (saleId: string) => {
    updateSaleStatus.mutate({
      saleId,
      status: 'cancelado',
      notes: 'Rechazado por auditor'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'borrador':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Borrador</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="text-blue-600"><AlertCircle className="w-3 h-3 mr-1" />Enviado</Badge>;
      case 'completado':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando procesos de auditoría...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard de Auditoría</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales?.filter(sale => sale.status === 'borrador').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales?.filter(sale => sale.status === 'enviado').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas Pendientes de Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sales?.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {sale.clients?.first_name} {sale.clients?.last_name}
                    </span>
                    {getStatusBadge(sale.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Plan: {sale.plans?.name} - ${sale.plans?.price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Vendedor: {sale.salesperson?.first_name} {sale.salesperson?.last_name}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleApprove(sale.id)}
                    disabled={updateSaleStatus.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleReject(sale.id)}
                    disabled={updateSaleStatus.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
            
            {!sales?.length && (
              <div className="text-center py-8 text-muted-foreground">
                No hay ventas pendientes de auditoría
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuditDashboard;
