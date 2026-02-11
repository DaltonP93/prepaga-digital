
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSales } from '@/hooks/useSales';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

const RecentContractsWidget = () => {
  const { data: sales, isLoading } = useSales();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contratos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentSales = sales?.slice(0, 4) || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'firmado':
      case 'completado':
        return 'default';
      case 'enviado':
        return 'secondary';
      case 'borrador':
        return 'outline';
      case 'cancelado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'firmado':
      case 'completado':
        return 'text-green-600';
      case 'enviado':
        return 'text-blue-600';
      case 'borrador':
        return 'text-gray-600';
      case 'cancelado':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'hace minutos';
    if (diffHours < 24) return `hace ${diffHours}h`;
    return `hace ${Math.floor(diffHours / 24)}d`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contratos Recientes</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sales">Ver todos</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-primary">
                      {sale.contract_number || `CON-${sale.id?.slice(-4)}`}
                    </div>
                    <Badge variant={getStatusBadgeVariant(sale.status || 'borrador')}>
                      {sale.status === 'firmado' ? 'Firmado' :
                       sale.status === 'completado' ? 'Completado' :
                       sale.status === 'enviado' ? 'Pendiente Firma' :
                       sale.status === 'borrador' ? 'Borrador' :
                       sale.status === 'cancelado' ? 'Cancelado' : 'Borrador'}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {sale.clients?.first_name} {sale.clients?.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(sale.created_at)} • {formatCurrency(sale.total_amount || 0)}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">
                        {sale.status === 'completado' || sale.status === 'firmado' ? '100%' :
                         sale.status === 'enviado' ? '50%' : '10%'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          sale.status === 'completado' || sale.status === 'firmado' ? 'bg-green-500' :
                          sale.status === 'enviado' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ 
                          width: sale.status === 'completado' || sale.status === 'firmado' ? '100%' :
                                 sale.status === 'enviado' ? '50%' : '10%'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" asChild className="ml-4">
                  <Link to={`/sales/${sale.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay contratos recientes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentContractsWidget;
