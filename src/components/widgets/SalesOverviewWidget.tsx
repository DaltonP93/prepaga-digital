import { TrendingUp, Users, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboard';

const SalesOverviewWidget = () => {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumen de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "Ventas Totales",
      value: data?.totalSales || 0,
      icon: DollarSign,
      change: "+12.5%"
    },
    {
      title: "Clientes",
      value: data?.totalClients || 0,
      icon: Users,
      change: "+8.1%"
    },
    {
      title: "Documentos Firmados",
      value: data?.signedDocuments || 0,
      icon: FileText,
      change: "+3.2%"
    },
    {
      title: "Ingresos Totales",
      value: `$${(data?.totalRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      change: "+15.3%"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumen de Ventas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesOverviewWidget;