
import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Eye, Edit, FileText, User, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSales } from '@/hooks/useSales';
import { SalesActionButtons } from '@/components/SalesActionButtons';

const Sales = () => {
  const { data: sales, isLoading } = useSales();

  if (isLoading) {
    return (
      <Layout title="Ventas" description="Gestión de ventas y contratos">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrador': return 'bg-gray-100 text-gray-800';
      case 'enviado': return 'bg-blue-100 text-blue-800';
      case 'firmado': return 'bg-green-100 text-green-800';
      case 'completado': return 'bg-purple-100 text-purple-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout title="Ventas" description="Gestión de ventas y contratos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
            <p className="text-muted-foreground">
              Gestiona las ventas y su proceso de firma
            </p>
          </div>
          <Button asChild>
            <Link to="/new-sale">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Venta
            </Link>
          </Button>
        </div>

        {sales && sales.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay ventas aún</h3>
                <p className="text-muted-foreground mb-4">
                  Crea tu primera venta para comenzar
                </p>
                <Button asChild>
                  <Link to="/new-sale">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Venta
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {sales?.map((sale) => (
              <Card key={sale.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {sale.clients?.first_name} {sale.clients?.last_name}
                      </CardTitle>
                      <Badge className={getStatusColor(sale.status)}>
                        {sale.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/sales/${sale.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/sales/${sale.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Información básica */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Cliente:</span>
                          <span>{sale.clients?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Fecha:</span>
                          <span>{new Date(sale.sale_date || '').toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Plan:</span>
                          <span>{sale.plans?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Monto:</span>
                          <span>{Number(sale.total_amount || 0).toLocaleString()} Gs.</span>
                        </div>
                      </div>

                      {sale.contract_number && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Contrato:</span> {sale.contract_number}
                        </div>
                      )}

                      {sale.request_number && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Solicitud:</span> {sale.request_number}
                        </div>
                      )}
                    </div>

                    {/* Acciones de firma */}
                    <div className="lg:col-span-1">
                      <SalesActionButtons sale={sale} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sales;
