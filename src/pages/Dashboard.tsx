
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useSales } from '@/hooks/useSales';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, loading } = useSimpleAuthContext();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  console.log('📊 Dashboard: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email 
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const busy = statsLoading || salesLoading || clientsLoading;
  const totalSales = stats?.totalSales || 0;
  const totalClients = stats?.totalClients || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const signedDocuments = stats?.signedDocuments || 0;
  const salesGrowth = stats?.salesGrowth || 0;
  const clientsGrowth = stats?.clientsGrowth || 0;

  const completedSales = sales.filter((sale) => sale.status === 'completado' || sale.status === 'firmado').length;
  const pendingSales = sales.filter((sale) => sale.status === 'borrador' || sale.status === 'enviado').length;
  const canceledSales = sales.filter((sale) => sale.status === 'cancelado').length;
  const conversionRate = totalSales > 0 ? (completedSales / totalSales) * 100 : 0;

  const recentSales = sales.slice(0, 5);
  const recentClients = clients.slice(0, 5);

  const statusRows = [
    {
      label: 'Completadas/Firmadas',
      value: completedSales,
      color: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    {
      label: 'Pendientes',
      value: pendingSales,
      color: 'bg-amber-500',
      icon: Clock3,
    },
    {
      label: 'Canceladas',
      value: canceledSales,
      color: 'bg-rose-500',
      icon: XCircle,
    },
  ];

  const score = Math.min(
    100,
    Math.round(conversionRate * 0.6 + (Math.max(salesGrowth, 0) * 0.25) + (Math.max(clientsGrowth, 0) * 0.15)),
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/10 p-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.10),transparent_30%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              Centro de Control Comercial
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard Ejecutivo</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Vista estratégica de ventas, conversión y operación diaria con foco en decisiones rápidas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/sales">
                <Plus className="h-4 w-4 mr-2" />
                Nueva venta
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/clients">
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo cliente
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Ingresos Totales</span>
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-emerald-600">Mes actual</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Ventas</span>
                <Briefcase className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{totalSales}</p>
              <p className="text-xs text-muted-foreground">Crecimiento: {salesGrowth >= 0 ? '+' : ''}{salesGrowth}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Clientes</span>
                <Users className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{totalClients}</p>
              <p className="text-xs text-muted-foreground">Crecimiento: {clientsGrowth >= 0 ? '+' : ''}{clientsGrowth}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-background/70 backdrop-blur">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Documentos Firmados</span>
                <FileCheck2 className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{signedDocuments}</p>
              <p className="text-xs text-muted-foreground">Total histórico</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Embudo de Conversión
            </CardTitle>
            <CardDescription>Estado actual del pipeline comercial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statusRows.map((row) => {
                const Icon = row.icon;
                const percent = totalSales > 0 ? (row.value / totalSales) * 100 : 0;
                return (
                  <div key={row.label} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{row.label}</span>
                      </div>
                      <span className="text-lg font-semibold">{row.value}</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{percent.toFixed(1)}% del total</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Health Score Comercial</p>
                <Badge variant={score >= 75 ? 'default' : 'secondary'}>{score}/100</Badge>
              </div>
              <Progress value={score} className="h-2 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">
                Basado en conversión, crecimiento y estabilidad del pipeline.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acciones Inteligentes</CardTitle>
            <CardDescription>Prioridades recomendadas para hoy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-medium">Seguir pendientes</p>
              <p className="text-xs text-muted-foreground">
                {pendingSales} ventas esperan gestión o envío de firma.
              </p>
              <Button size="sm" variant="ghost" className="mt-2 px-0 h-auto" asChild>
                <Link to="/sales">Ir a ventas <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-medium">Recuperar cancelaciones</p>
              <p className="text-xs text-muted-foreground">
                {canceledSales} operaciones canceladas para revisar oportunidad.
              </p>
              <Button size="sm" variant="ghost" className="mt-2 px-0 h-auto" asChild>
                <Link to="/sales">Ver canceladas <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-medium">Expandir cartera</p>
              <p className="text-xs text-muted-foreground">
                Crecimiento de clientes del mes: {clientsGrowth >= 0 ? '+' : ''}{clientsGrowth}%.
              </p>
              <Button size="sm" variant="ghost" className="mt-2 px-0 h-auto" asChild>
                <Link to="/clients">Gestionar clientes <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actividad de Ventas</CardTitle>
            <CardDescription>Últimas operaciones registradas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {busy && <p className="text-sm text-muted-foreground">Cargando actividad...</p>}
            {!busy && recentSales.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay ventas recientes.</p>
            )}
            {!busy && recentSales.map((sale) => (
              <div key={sale.id} className="rounded-lg border border-border/60 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {sale.clients?.first_name || 'Cliente'} {sale.clients?.last_name || ''}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {sale.plans?.name || 'Plan sin nombre'} · {sale.companies?.name || 'Sin empresa'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(sale.total_amount || 0)}</p>
                  <Badge variant="outline" className="text-[11px]">
                    {sale.status || 'sin estado'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Nuevos Clientes</CardTitle>
            <CardDescription>Ingresos recientes a la cartera</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {busy && <p className="text-sm text-muted-foreground">Cargando clientes...</p>}
            {!busy && recentClients.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay clientes recientes.</p>
            )}
            {!busy && recentClients.map((client) => (
              <div key={client.id} className="rounded-lg border border-border/60 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{client.first_name} {client.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{client.email || 'Sin email'}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString('es-PY') : '-'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
