
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemStatus } from "@/components/SystemStatus";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Building2, FileText, DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useAuthContext } from "@/components/AuthProvider";

const Dashboard = () => {
  const { profile } = useAuthContext();
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <Layout title="Dashboard" description="Resumen general del sistema">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard" description="Resumen general del sistema">
        <div className="text-center py-8">
          <p className="text-red-500">Error al cargar datos del dashboard</p>
        </div>
      </Layout>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Preparar datos para gráficos
  const salesStatusData = Object.entries(stats?.salesByStatus || {}).map(([status, count]) => ({
    name: status,
    value: Number(count)
  }));

  const isGrowthPositive = (growth: number) => growth > 0;

  return (
    <Layout 
      title={`¡Bienvenido, ${profile?.first_name || 'Usuario'}!`} 
      description="Resumen general del sistema"
    >
      <div className="space-y-6">
        {/* Estadísticas principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalRevenue?.toLocaleString('es-PY') || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {isGrowthPositive(stats?.salesGrowth || 0) ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                <span className={isGrowthPositive(stats?.salesGrowth || 0) ? "text-green-500" : "text-red-500"}>
                  {Math.abs(stats?.salesGrowth || 0)}%
                </span>
                <span className="ml-1">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {isGrowthPositive(stats?.clientsGrowth || 0) ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                <span className={isGrowthPositive(stats?.clientsGrowth || 0) ? "text-green-500" : "text-red-500"}>
                  {Math.abs(stats?.clientsGrowth || 0)}%
                </span>
                <span className="ml-1">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos Firmados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.signedDocuments || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {isGrowthPositive(stats?.documentsGrowth || 0) ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                <span className={isGrowthPositive(stats?.documentsGrowth || 0) ? "text-green-500" : "text-red-500"}>
                  {Math.abs(stats?.documentsGrowth || 0)}%
                </span>
                <span className="ml-1">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Firmas Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingSignatures || 0}</div>
              <p className="text-xs text-muted-foreground">
                Documentos esperando firma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos y resúmenes */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Estado de Ventas</CardTitle>
              <CardDescription>Distribución por estado de las ventas</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={salesStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Resumen del Sistema</CardTitle>
              <CardDescription>Estadísticas generales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Usuarios Activos</span>
                </div>
                <Badge variant="secondary">{stats?.usersCount || 0}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Empresas</span>
                </div>
                <Badge variant="secondary">{stats?.companiesCount || 0}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Total Ventas</span>
                </div>
                <Badge variant="secondary">{stats?.totalSales || 0}</Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Ventas Completadas</span>
                  <span>{stats?.completedSales || 0}/{stats?.totalSales || 0}</span>
                </div>
                <Progress 
                  value={stats?.totalSales ? ((stats?.completedSales || 0) / stats?.totalSales) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estado del Sistema */}
        {profile?.role === 'super_admin' && (
          <SystemStatus />
        )}

        {/* Ventas recientes */}
        {stats?.recentSales && stats.recentSales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventas Recientes</CardTitle>
              <CardDescription>Últimas {stats.recentSales.length} ventas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">
                        {sale.clients?.first_name} {sale.clients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sale.plans?.name} - {sale.companies?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${sale.total_amount?.toLocaleString('es-PY') || 0}</p>
                      <Badge variant={sale.status === 'completado' ? 'default' : 'secondary'}>
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
