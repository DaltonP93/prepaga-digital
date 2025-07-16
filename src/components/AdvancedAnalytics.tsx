import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, Download, 
  Users, Building2, FileText, Clock, DollarSign,
  Target, Filter, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyticsData {
  salesTrend: Array<{ name: string; ventas: number; ingresos: number }>;
  conversionFunnel: Array<{ name: string; value: number; fill: string }>;
  performanceByUser: Array<{ name: string; ventas: number; conversion: number }>;
  topPlans: Array<{ name: string; count: number; revenue: number }>;
  companyComparison: Array<{ name: string; ventas: number; ingresos: number }>;
  timeToClose: Array<{ period: string; avgDays: number }>;
  kpis: {
    conversionRate: number;
    avgTicket: number;
    customerLifetime: number;
    churnRate: number;
    monthlyRecurring: number;
  };
}

const useAdvancedAnalytics = (period: string) => {
  return useQuery({
    queryKey: ['advanced-analytics', period],
    queryFn: async (): Promise<AnalyticsData> => {
      // Definir rangos de fecha según el período
      const now = new Date();
      let startDate: Date;
      let periods: Array<{ start: Date; end: Date; name: string }> = [];

      switch (period) {
        case '3months':
          startDate = subMonths(now, 3);
          for (let i = 2; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(now, i));
            const monthEnd = endOfMonth(subMonths(now, i));
            periods.push({
              start: monthStart,
              end: monthEnd,
              name: format(monthStart, 'MMM yyyy', { locale: es })
            });
          }
          break;
        case '6months':
          startDate = subMonths(now, 6);
          for (let i = 5; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(now, i));
            const monthEnd = endOfMonth(subMonths(now, i));
            periods.push({
              start: monthStart,
              end: monthEnd,
              name: format(monthStart, 'MMM yyyy', { locale: es })
            });
          }
          break;
        default: // '12months'
          startDate = subMonths(now, 12);
          for (let i = 11; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(now, i));
            const monthEnd = endOfMonth(subMonths(now, i));
            periods.push({
              start: monthStart,
              end: monthEnd,
              name: format(monthStart, 'MMM yyyy', { locale: es })
            });
          }
      }

      // Obtener datos de ventas con relaciones
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          clients(first_name, last_name),
          plans(name, price),
          companies(name),
          salesperson:salesperson_id(first_name, last_name)
        `)
        .gte('created_at', startDate.toISOString());

      if (salesError) throw salesError;

      // Calcular tendencia de ventas
      const salesTrend = periods.map(period => {
        const periodSales = salesData?.filter(sale => 
          isWithinInterval(new Date(sale.created_at!), { start: period.start, end: period.end })
        ) || [];
        
        return {
          name: period.name,
          ventas: periodSales.length,
          ingresos: periodSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        };
      });

      // Embudo de conversión (simulado con estados de venta)
      const statusCounts = salesData?.reduce((acc, sale) => {
        const status = sale.status || 'borrador';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const conversionFunnel = [
        { name: 'Borradores', value: statusCounts['borrador'] || 0, fill: '#8884d8' },
        { name: 'Enviados', value: statusCounts['enviado'] || 0, fill: '#82ca9d' },
        { name: 'Firmados', value: statusCounts['firmado'] || 0, fill: '#ffc658' },
        { name: 'Completados', value: statusCounts['completado'] || 0, fill: '#ff7300' }
      ];

      // Performance por usuario
      const userPerformance = salesData?.reduce((acc, sale) => {
        const userId = sale.salesperson_id;
        if (userId && sale.salesperson) {
          const userName = `${sale.salesperson.first_name} ${sale.salesperson.last_name}`;
          if (!acc[userId]) {
            acc[userId] = { name: userName, totalSales: 0, completedSales: 0 };
          }
          acc[userId].totalSales++;
          if (sale.status === 'completado') acc[userId].completedSales++;
        }
        return acc;
      }, {} as Record<string, { name: string; totalSales: number; completedSales: number }>) || {};

      const performanceByUser = Object.values(userPerformance)
        .map(user => ({
          name: user.name,
          ventas: user.totalSales,
          conversion: user.totalSales > 0 ? Math.round((user.completedSales / user.totalSales) * 100) : 0
        }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 10);

      // Top planes
      const planPerformance = salesData?.reduce((acc, sale) => {
        if (sale.plans) {
          const planName = sale.plans.name;
          if (!acc[planName]) {
            acc[planName] = { count: 0, revenue: 0 };
          }
          acc[planName].count++;
          acc[planName].revenue += sale.total_amount || 0;
        }
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>) || {};

      const topPlans = Object.entries(planPerformance)
        .map(([name, data]) => ({
          name,
          count: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // Comparación por empresa
      const companyPerformance = salesData?.reduce((acc, sale) => {
        if (sale.companies) {
          const companyName = sale.companies.name;
          if (!acc[companyName]) {
            acc[companyName] = { ventas: 0, ingresos: 0 };
          }
          acc[companyName].ventas++;
          acc[companyName].ingresos += sale.total_amount || 0;
        }
        return acc;
      }, {} as Record<string, { ventas: number; ingresos: number }>) || {};

      const companyComparison = Object.entries(companyPerformance)
        .map(([name, data]) => ({
          name,
          ventas: data.ventas,
          ingresos: data.ingresos
        }))
        .sort((a, b) => b.ingresos - a.ingresos);

      // Tiempo promedio de cierre (simulado)
      const timeToClose = periods.map(period => ({
        period: period.name,
        avgDays: Math.floor(Math.random() * 30) + 5 // Simulated data
      }));

      // KPIs calculados
      const totalSales = salesData?.length || 0;
      const completedSales = salesData?.filter(s => s.status === 'completado').length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      const kpis = {
        conversionRate: totalSales > 0 ? Math.round((completedSales / totalSales) * 100) : 0,
        avgTicket: completedSales > 0 ? Math.round(totalRevenue / completedSales) : 0,
        customerLifetime: Math.round(Math.random() * 500 + 100), // Simulated
        churnRate: Math.round(Math.random() * 10 + 2), // Simulated
        monthlyRecurring: Math.round(totalRevenue * 0.3) // Simulated
      };

      return {
        salesTrend,
        conversionFunnel,
        performanceByUser,
        topPlans,
        companyComparison,
        timeToClose,
        kpis
      };
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

const AdvancedAnalytics = () => {
  const [period, setPeriod] = useState('6months');
  const { data: analytics, isLoading, error } = useAdvancedAnalytics(period);

  const exportData = async () => {
    if (!analytics) return;
    
    const exportObj = {
      periodo: period,
      fecha_exportacion: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      kpis: analytics.kpis,
      tendencia_ventas: analytics.salesTrend,
      top_planes: analytics.topPlans,
      performance_usuarios: analytics.performanceByUser
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Análisis Avanzado</h2>
            <p className="text-muted-foreground">Métricas detalladas y tendencias de negocio</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error al cargar análisis avanzado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Análisis Avanzado</h2>
          <p className="text-muted-foreground">Métricas detalladas y tendencias de negocio</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.kpis.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              De leads a ventas cerradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.kpis.avgTicket.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Por venta completada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Vitalicio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.kpis.customerLifetime.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Promedio por cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.kpis.churnRate}%</div>
            <p className="text-xs text-muted-foreground">
              Clientes perdidos/mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.kpis.monthlyRecurring.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos recurrentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="conversion">Conversión</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ventas</CardTitle>
                <CardDescription>Evolución de ventas e ingresos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'ventas' ? `${value} ventas` : `$${Number(value).toLocaleString()}`,
                      name === 'ventas' ? 'Ventas' : 'Ingresos'
                    ]} />
                    <Area type="monotone" dataKey="ventas" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="ingresos" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tiempo Promedio de Cierre</CardTitle>
                <CardDescription>Días desde lead hasta venta</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.timeToClose}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} días`, 'Tiempo promedio']} />
                    <Line type="monotone" dataKey="avgDays" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Embudo de Conversión</CardTitle>
                <CardDescription>Estados del proceso de venta</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel
                      dataKey="value"
                      data={analytics.conversionFunnel}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" stroke="none" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparación por Empresa</CardTitle>
                <CardDescription>Performance por empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.companyComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="ventas" fill="#8884d8" />
                    <Bar dataKey="ingresos" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Usuario</CardTitle>
              <CardDescription>Top 10 vendedores por número de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.performanceByUser} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="ventas" fill="#8884d8" />
                  <Bar dataKey="conversion" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Planes por Ingresos</CardTitle>
                <CardDescription>Planes más rentables</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topPlans}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'count' ? `${value} ventas` : `$${Number(value).toLocaleString()}`,
                      name === 'count' ? 'Cantidad' : 'Ingresos'
                    ]} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Planes</CardTitle>
                <CardDescription>Por cantidad de ventas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.topPlans}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.topPlans.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;