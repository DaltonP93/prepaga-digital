
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Activity, Users, AlertTriangle } from "lucide-react";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

const AuditDashboard = () => {
  const { profile } = useSimpleAuthContext();

  // Solo super admins pueden acceder
  if (profile?.role !== 'super_admin') {
    return (
      <Layout title="Acceso Denegado" description="No tienes permisos para acceder a esta página">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              Solo los super administradores pueden acceder a la auditoría del sistema.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Auditoría del Sistema" 
      description="Monitoreo y logs de actividad del sistema"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Auditoría</h2>
            <p className="text-muted-foreground">
              Monitoreo de actividades y seguridad del sistema
            </p>
          </div>
        </div>

        {/* Estadísticas de Auditoría */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Totales</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +20% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">
                +2 nuevos usuarios
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Intentos de Acceso</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">892</div>
              <p className="text-xs text-muted-foreground">
                98% exitosos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas de Seguridad</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Última hace 2 días
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimos eventos registrados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>2025-01-30 10:30</TableCell>
                  <TableCell>dalton.perez@saa.com.py</TableCell>
                  <TableCell>LOGIN</TableCell>
                  <TableCell>Sistema</TableCell>
                  <TableCell>
                    <Badge variant="default">Exitoso</Badge>
                  </TableCell>
                  <TableCell>192.168.1.100</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2025-01-30 10:25</TableCell>
                  <TableCell>usuario@example.com</TableCell>
                  <TableCell>CREATE</TableCell>
                  <TableCell>Venta</TableCell>
                  <TableCell>
                    <Badge variant="default">Exitoso</Badge>
                  </TableCell>
                  <TableCell>192.168.1.101</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2025-01-30 10:20</TableCell>
                  <TableCell>admin@example.com</TableCell>
                  <TableCell>UPDATE</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>
                    <Badge variant="default">Exitoso</Badge>
                  </TableCell>
                  <TableCell>192.168.1.102</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2025-01-30 10:15</TableCell>
                  <TableCell>unknown</TableCell>
                  <TableCell>LOGIN</TableCell>
                  <TableCell>Sistema</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Fallido</Badge>
                  </TableCell>
                  <TableCell>192.168.1.200</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Alertas de Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Seguridad</CardTitle>
            <CardDescription>
              Eventos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Múltiples intentos fallidos de login</p>
                    <p className="text-sm text-muted-foreground">
                      5 intentos desde la IP 192.168.1.200 en los últimos 10 minutos
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Hace 2 horas</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Acceso desde nueva ubicación</p>
                    <p className="text-sm text-muted-foreground">
                      Usuario admin@example.com accedió desde una nueva IP
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Hace 1 día</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AuditDashboard;
