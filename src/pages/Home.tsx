
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  ShoppingBag, 
  FileText, 
  TrendingUp,
  DollarSign,
  Clock
} from 'lucide-react';

const Home = () => {
  return (
    <Layout title="Dashboard" description="Panel de control principal">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">128</div>
              <p className="text-xs text-muted-foreground">
                +20.1% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">
                +12% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">245</div>
              <p className="text-xs text-muted-foreground">
                +8% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231</div>
              <p className="text-xs text-muted-foreground">
                +25% desde el mes pasado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Nueva venta completada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cliente: Juan Pérez - Plan Premium
                    </p>
                  </div>
                  <div className="ml-auto font-medium">$2,500</div>
                </div>
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-blue-500" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Documento firmado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Contrato de seguros - María García
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-purple-500" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Nuevo cliente registrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ana Rodríguez - Plan Básico
                    </p>
                  </div>
                  <div className="ml-auto font-medium">$890</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Resumen del Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ventas Completadas</span>
                  <span className="font-medium">45</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Documentos Firmados</span>
                  <span className="font-medium">38</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nuevos Clientes</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasa de Conversión</span>
                  <span className="font-medium">84%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
