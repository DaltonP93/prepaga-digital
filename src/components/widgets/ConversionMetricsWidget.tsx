import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSales } from '@/hooks/useSales';

const ConversionMetricsWidget = () => {
  const { data: sales, isLoading: salesLoading } = useSales();

  if (salesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas de Conversión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular métricas de conversión
  const totalSales = sales?.length || 0;
  const completedSales = sales?.filter(sale => sale.status === 'completado' || sale.status === 'firmado').length || 0;
  const pendingSales = sales?.filter(sale => sale.status === 'borrador' || sale.status === 'enviado').length || 0;
  const canceledSales = sales?.filter(sale => sale.status === 'cancelado').length || 0;
  
  const conversionRate = totalSales > 0 ? (completedSales / totalSales) * 100 : 0;
  const pendingRate = totalSales > 0 ? (pendingSales / totalSales) * 100 : 0;
  const cancelationRate = totalSales > 0 ? (canceledSales / totalSales) * 100 : 0;

  // Datos para el gráfico de tendencia (últimos 7 días)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const trendData = last7Days.map(date => {
    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');
    
    const daySales = sales?.filter(sale => {
      const saleDate = new Date(sale.created_at || '');
      return saleDate >= dayStart && saleDate <= dayEnd;
    }) || [];
    
    const dayCompleted = daySales.filter(sale => 
      sale.status === 'completado' || sale.status === 'firmado'
    ).length;
    
    const dayConversion = daySales.length > 0 ? (dayCompleted / daySales.length) * 100 : 0;
    
    return {
      date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      ventas: daySales.length,
      completadas: dayCompleted,
      conversion: Math.round(dayConversion)
    };
  });

  // Métricas de formularios simplificadas
  const formCompletionRate = totalSales > 0 ? (completedSales / totalSales) * 100 : 0;

  const metrics = [
    {
      title: "Tasa de Conversión",
      value: `${conversionRate.toFixed(1)}%`,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
      trend: conversionRate > 75 ? 'up' : conversionRate > 50 ? 'stable' : 'down'
    },
    {
      title: "Ventas Pendientes",
      value: `${pendingRate.toFixed(1)}%`,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      trend: pendingRate < 30 ? 'up' : 'stable'
    },
    {
      title: "Tasa de Cancelación",
      value: `${cancelationRate.toFixed(1)}%`,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      trend: cancelationRate < 10 ? 'up' : 'down'
    },
    {
      title: "Formularios Completados",
      value: `${formCompletionRate.toFixed(1)}%`,
      icon: CheckCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      trend: formCompletionRate > 80 ? 'up' : 'stable'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Métricas de Conversión</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${metric.bgColor}`}>
                      <Icon className={`h-3 w-3 ${metric.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{metric.title}</span>
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="text-xl font-bold">{metric.value}</div>
              </div>
            );
          })}
        </div>

        {/* Barras de progreso */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Conversión Total</span>
              <span className="font-medium">{conversionRate.toFixed(1)}%</span>
            </div>
            <Progress value={conversionRate} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Completado de Formularios</span>
              <span className="font-medium">{formCompletionRate.toFixed(1)}%</span>
            </div>
            <Progress value={formCompletionRate} className="h-2" />
          </div>
        </div>

        {/* Distribución por estados */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Estado de Ventas</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="text-xs">
              Completadas: {completedSales}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Pendientes: {pendingSales}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              Canceladas: {canceledSales}
            </Badge>
          </div>
        </div>

        {/* Gráfico de tendencia */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Tendencia (7 días)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'conversion') return [`${value}%`, 'Conversión'];
                    return [value, name === 'ventas' ? 'Ventas' : 'Completadas'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="conversion"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversionMetricsWidget;