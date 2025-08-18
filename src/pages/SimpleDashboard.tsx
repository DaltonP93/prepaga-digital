
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOptimizedDashboard } from '@/hooks/useOptimizedQueries';
import { useBranding } from '@/components/CompanyBrandingProvider';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SimpleDashboard = () => {
  const { data: stats, isLoading, error } = useOptimizedDashboard();
  const { companyName, primaryColor } = useBranding();
  const { logLogin } = useAuditLogger();
  const { profile } = useSimpleAuthContext();

  // Log de acceso al dashboard
  React.useEffect(() => {
    logLogin();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Cargando métricas...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted rounded-t-lg"></CardHeader>
              <CardContent className="h-16 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              No se pudieron cargar las métricas: {error.message}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard - {companyName}</h1>
          <p className="text-muted-foreground">
            Bienvenido, {profile?.first_name} {profile?.last_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3" />
            Sistema Activo
          </Badge>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center ${stats?.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats?.salesGrowth || 0}% vs mes anterior
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                +{stats?.documentsGrowth || 0}% este mes
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                +{stats?.clientsGrowth || 0}% nuevos este mes
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmas Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingSales || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedSales || 0} completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estado de procesos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Estado de Firmas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Completadas</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {stats?.completedSales || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pendientes</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {stats?.pendingSales || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total</span>
              <Badge variant="outline">
                {stats?.totalSales || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentSales?.slice(0, 3).map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {sale.contract_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.clients?.first_name} {sale.clients?.last_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={sale.status === 'completado' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {sale.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(sale.created_at), 'dd/MM', { locale: es })}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">
                  No hay actividad reciente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Accesos directos a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              Nueva Venta
            </Button>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Gestionar Clientes
            </Button>
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              Ver Reportes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleDashboard;
