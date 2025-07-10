
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";

const stats = [
  {
    title: "Empresas Activas",
    value: "24",
    description: "Total de empresas registradas",
    icon: Building2,
    trend: "+2 este mes"
  },
  {
    title: "Usuarios",
    value: "156",
    description: "Usuarios en el sistema",
    icon: Users,
    trend: "+12 este mes"
  },
  {
    title: "Documentos Firmados",
    value: "1,234",
    description: "Total de firmas procesadas",
    icon: FileText,
    trend: "+89 esta semana"
  },
  {
    title: "Ventas del Mes",
    value: "$45,230",
    description: "Ingresos generados",
    icon: TrendingUp,
    trend: "+15% vs mes anterior"
  }
];

const recentActivity = [
  {
    id: 1,
    action: "Nueva empresa registrada",
    company: "MediCorp SA",
    time: "Hace 2 horas",
    status: "success"
  },
  {
    id: 2,
    action: "Documento firmado",
    company: "Salud Plus",
    time: "Hace 4 horas",
    status: "info"
  },
  {
    id: 3,
    action: "Plan actualizado",
    company: "VidaSana",
    time: "Hace 6 horas",
    status: "warning"
  }
];

const Dashboard = () => {
  return (
    <Layout 
      title="Dashboard Principal" 
      description="Resumen general del sistema de seguros médicos"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Activity */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas acciones en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="flex h-2 w-2 rounded-full bg-blue-600" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.company}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Funciones más utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Crear Usuario</p>
                  <p className="text-xs text-muted-foreground">Agregar nuevo usuario al sistema</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Nuevo Template</p>
                  <p className="text-xs text-muted-foreground">Crear plantilla de documento</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Ver Reportes</p>
                  <p className="text-xs text-muted-foreground">Análisis y estadísticas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documentos Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-2xl font-bold">23</span>
                <span className="text-sm text-muted-foreground">esperando firma</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Firmados Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold">47</span>
                <span className="text-sm text-muted-foreground">completados</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tasa de Conversión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-2xl font-bold">87%</span>
                <span className="text-sm text-muted-foreground">este mes</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
