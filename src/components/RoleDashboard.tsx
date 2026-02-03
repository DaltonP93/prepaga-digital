
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, TrendingUp, Users, FileText, DollarSign, Target, Calendar, Activity } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useClients } from "@/hooks/useClients";
import { useTemplates } from "@/hooks/useTemplates";
import { usePlans } from "@/hooks/usePlans";
import { useCompanies } from "@/hooks/useCompanies";

export function RoleDashboard() {
  const { profile } = useSimpleAuthContext();
  const { data: sales = [] } = useSales();
  const { data: clients = [] } = useClients();
  const { templates = [] } = useTemplates();
  const { data: plans = [] } = usePlans();
  const { data: companies = [] } = useCompanies();

  if (!profile) return null;

  const userRole = profile.role || 'vendedor';
  const isVendedor = userRole === 'vendedor';
  const isGestorOrAdmin = ['gestor', 'admin', 'super_admin'].includes(userRole);

  // Filtrar datos según el rol
  const filteredSales = isVendedor 
    ? sales.filter(sale => sale.salesperson_id === profile.id)
    : sales;

  const filteredClients = isVendedor
    ? clients.filter(client => 
        sales.some(sale => sale.client_id === client.id && sale.salesperson_id === profile.id)
      )
    : clients;

  // Estadísticas generales
  const totalSales = filteredSales.length;
  const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const completedSales = filteredSales.filter(sale => sale.status === 'completado').length;
  const pendingSales = filteredSales.filter(sale => sale.status === 'borrador').length;

  // Estadísticas por mes actual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySales = filteredSales.filter(sale => {
    const saleDate = new Date(sale.created_at || new Date());
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  });

  const monthlyAmount = monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

  // Find the user's company
  const userCompany = companies.find(company => company.id === profile?.company_id);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header con información del usuario */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile.avatar_url} alt={`${profile.first_name} ${profile.last_name}`} />
              <AvatarFallback>
                {getInitials(profile.first_name || '', profile.last_name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                Bienvenido, {profile.first_name} {profile.last_name}
              </h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {userRole === 'super_admin' && 'Super Admin'}
                  {userRole === 'admin' && 'Administrador'}
                  {userRole === 'gestor' && 'Gestor'}
                  {userRole === 'vendedor' && 'Vendedor'}
                </Badge>
                {userCompany && (
                  <span className="text-sm text-muted-foreground">
                    • {userCompany.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline">3</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isVendedor ? 'Mis Ventas' : 'Total Ventas'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {completedSales} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isVendedor ? 'Mis Ingresos' : 'Ingresos Totales'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isVendedor ? 'Mis Clientes' : 'Total Clientes'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredClients.length}</div>
            <p className="text-xs text-muted-foreground">
              Registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlySales.length} ventas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas específicas por rol */}
      {isGestorOrAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                Plantillas activas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planes</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.length}</div>
              <p className="text-xs text-muted-foreground">
                Disponibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSales}</div>
              <p className="text-xs text-muted-foreground">
                Ventas por procesar
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vista rápida de ventas recientes */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isVendedor ? 'Mis Ventas Recientes' : 'Ventas Recientes'}
          </CardTitle>
          <CardDescription>
            Últimas {isVendedor ? 'ventas realizadas' : 'ventas de la empresa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">
                      {sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sale.plans?.name || 'Sin plan'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(sale.total_amount || 0)}</p>
                  <Badge variant={
                    sale.status === 'completado' ? 'default' :
                    sale.status === 'firmado' ? 'secondary' :
                    sale.status === 'enviado' ? 'outline' :
                    'destructive'
                  }>
                    {sale.status}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay ventas registradas
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
