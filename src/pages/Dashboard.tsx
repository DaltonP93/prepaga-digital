
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, ShoppingCart, DollarSign, TrendingUp, FileText } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useAuthContext } from "@/components/AuthProvider";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { profile } = useAuthContext();

  if (isLoading) {
    return (
      <Layout title="Dashboard" description="Panel de control principal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

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

  return (
    <Layout title="Dashboard" description="Panel de control principal">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Bienvenido, {profile?.first_name} {profile?.last_name}
          </h2>
          <p className="text-muted-foreground">
            Aquí tienes un resumen de tu actividad
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.usersCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Usuarios registrados en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.companiesCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Empresas registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
              <p className="text-xs text-muted-foreground">
                Ventas totales registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">
                Ingresos acumulados
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas Recientes</CardTitle>
              <CardDescription>
                Las últimas 5 ventas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.plans?.name || 'Sin plan'}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium">${sale.total_amount || 0}</p>
                      <Badge variant={getStatusBadgeVariant(sale.status || 'borrador')} className="text-xs">
                        {getStatusLabel(sale.status || 'borrador')}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!stats?.recentSales || stats.recentSales.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay ventas recientes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Estado</CardTitle>
              <CardDescription>
                Distribución de ventas según su estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats?.salesByStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(status)}>
                        {getStatusLabel(status)}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(stats?.salesByStatus || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay datos de ventas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
