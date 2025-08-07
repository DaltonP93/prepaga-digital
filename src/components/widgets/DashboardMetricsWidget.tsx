
import { TrendingUp, TrendingDown, Users, FileText, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboard';

const DashboardMetricsWidget = () => {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Contratos",
      value: data?.totalSales || 0,
      change: data?.salesGrowth || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      changeType: (data?.salesGrowth || 0) >= 0 ? "positive" : "negative"
    },
    {
      title: "Firmas Pendientes", 
      value: data?.pendingSignatures || 0,
      change: -5.2,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      changeType: "negative"
    },
    {
      title: "Completados Hoy",
      value: data?.completedSales || 0,
      change: 8.1,
      icon: CheckCircle,
      color: "text-green-600", 
      bgColor: "bg-green-100",
      changeType: "positive"
    },
    {
      title: "Clientes Activos",
      value: data?.totalClients || 0,
      change: data?.clientsGrowth || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      changeType: (data?.clientsGrowth || 0) >= 0 ? "positive" : "negative"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isPositive = metric.changeType === "positive";
        
        return (
          <Card key={metric.title} className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {metric.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-foreground">
                      {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                    </h3>
                  </div>
                  <div className="flex items-center mt-2 gap-1">
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{metric.change}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs mes anterior</span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardMetricsWidget;
