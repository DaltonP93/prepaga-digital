
import { SimpleLayout } from "@/components/SimpleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import { useDashboardStats } from "@/hooks/useDashboard";
import { TrendingUp, TrendingDown, Users, FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const SimpleDashboard = () => {
  const { profile, user, loading } = useSimpleAuthContext();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  console.log('🏠 SimpleDashboard: Renderizando dashboard', { 
    hasUser: !!user,
    hasProfile: !!profile,
    loading,
    profileName: profile?.first_name,
    userEmail: user?.email,
    statsLoading,
    stats
  });

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Ventas Totales",
      value: stats?.totalSales || 0,
      change: stats?.salesGrowth || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Total de contratos"
    },
    {
      title: "Ingresos",
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      change: 15.3,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Ingresos totales"
    },
    {
      title: "Clientes Activos",
      value: stats?.totalClients || 0,
      change: stats?.clientsGrowth || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      description: "Base de clientes"
    },
    {
      title: "Firmas Pendientes",
      value: stats?.pendingSignatures || 0,
      change: -8.2,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      description: "Esperando firma"
    }
  ];

  return (
    <SimpleLayout 
      title={`¡Bienvenido, ${profile?.first_name || user?.email || 'Usuario'}!`} 
      description="Dashboard Principal"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            const isPositive = kpi.change >= 0;
            
            return (
              <Card key={kpi.title} className="hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {kpi.title}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-foreground">
                          {kpi.value}
                        </h3>
                      </div>
                      <div className="flex items-center mt-2 gap-1">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{kpi.change}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">vs mes anterior</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                      <Icon className={`h-6 w-6 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Últimas Afiliaciones */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Últimas Afiliaciones</CardTitle>
                <CardDescription>Contratos recientes procesados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentSales?.slice(0, 5).map((sale, index) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(sale.clients?.first_name?.[0] || 'N') + (sale.clients?.last_name?.[0] || 'N')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {sale.clients?.first_name} {sale.clients?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sale.plans?.name} - ${(sale.total_amount || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          sale.status === 'completado' ? 'default' : 
                          sale.status === 'enviado' ? 'secondary' : 
                          'outline'
                        }>
                          {sale.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!stats?.recentSales || stats.recentSales.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay ventas recientes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estado de Firmas */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Firmas</CardTitle>
                <CardDescription>Seguimiento de documentos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Firmados</span>
                    </div>
                    <span className="font-semibold">{stats?.signedDocuments || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Pendientes</span>
                    </div>
                    <span className="font-semibold">{stats?.pendingSignatures || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">En Proceso</span>
                    </div>
                    <span className="font-semibold">{(stats?.totalSales || 0) - (stats?.completedSales || 0)}</span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(((stats?.signedDocuments || 0) / Math.max(stats?.totalSales || 1, 1)) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Tasa de conversión</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">Contrato firmado</div>
                  <div className="text-sm text-muted-foreground">CON-2025-001 • hace 2h</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">Nuevo contrato creado</div>
                  <div className="text-sm text-muted-foreground">CON-2025-002 • hace 3h</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">Recordatorio enviado</div>
                  <div className="text-sm text-muted-foreground">Cliente pendiente • hace 5h</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug info - solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">🔧 Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 text-gray-600">
                <p>• Usuario autenticado: {user ? '✅' : '❌'}</p>
                <p>• Perfil cargado: {profile ? '✅' : '❌'}</p>
                <p>• Stats cargadas: {stats ? '✅' : '❌'}</p>
                <p>• Email: {user?.email || 'No disponible'}</p>
                <p>• Nombre: {profile?.first_name || 'No disponible'}</p>
                <p>• Rol: {profile?.role || 'No disponible'}</p>
                <p>• Total ventas: {stats?.totalSales || 0}</p>
                <p>• Total clientes: {stats?.totalClients || 0}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SimpleLayout>
  );
};

export default SimpleDashboard;
