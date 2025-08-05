
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import RequireAuth from '@/components/RequireAuth';

const Sales = () => {
  const { data: sales, isLoading } = useSales();

  if (isLoading) {
    return (
      <RequireAuth>
        <Layout title="Ventas" description="Gestión de ventas">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Layout title="Ventas" description="Gestión de ventas y seguimiento">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Ventas</h1>
              <p className="text-muted-foreground">
                Gestiona y monitorea todas tus ventas
              </p>
            </div>
            <Button asChild>
              <Link to="/sales/new">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Link>
            </Button>
          </div>

          <div className="grid gap-6">
            {sales && sales.length > 0 ? (
              sales.map((sale) => (
                <Card key={sale.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Venta #{sale.id?.slice(-8)}</CardTitle>
                        <CardDescription>
                          Cliente: {sale.clients?.first_name} {sale.clients?.last_name}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatCurrency(sale.total_amount || 0)}
                        </div>
                        <Badge variant={
                          sale.status === 'firmado' ? 'default' :
                          sale.status === 'enviado' ? 'secondary' :
                          'outline'
                        }>
                          {sale.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Plan: {sale.plans?.name}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/sales/${sale.id}`}>
                          Ver Detalles
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No hay ventas registradas</p>
                  <Button asChild>
                    <Link to="/sales/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Primera Venta
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
};

export default Sales;
