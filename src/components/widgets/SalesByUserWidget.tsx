import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useUsers } from '@/hooks/useUsers';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#1e3a5f', '#475569', '#64748b'];

const SalesByUserWidget = () => {
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: users, isLoading: usersLoading } = useUsers();
  const [period, setPeriod] = useState('month');

  if (salesLoading || usersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ventas por Usuario</CardTitle>
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

  // Procesar datos de ventas por usuario
  const salesByUser = sales?.reduce((acc: any, sale: any) => {
    const userId = sale.salesperson_id;
    const userName = users?.find(u => u.id === userId)?.first_name + ' ' + users?.find(u => u.id === userId)?.last_name || 'Sin asignar';
    
    if (!acc[userId]) {
      acc[userId] = {
        name: userName,
        totalSales: 0,
        totalAmount: 0,
        completedSales: 0,
        conversionRate: 0
      };
    }
    
    acc[userId].totalSales += 1;
    acc[userId].totalAmount += sale.total_amount || 0;
    
    if (sale.status === 'completado' || sale.status === 'firmado') {
      acc[userId].completedSales += 1;
    }
    
    acc[userId].conversionRate = acc[userId].totalSales > 0 
      ? (acc[userId].completedSales / acc[userId].totalSales) * 100 
      : 0;
    
    return acc;
  }, {}) || {};

  const chartData = Object.values(salesByUser).map((user: any) => ({
    name: user.name,
    ventas: user.totalSales,
    ingresos: user.totalAmount,
    completadas: user.completedSales,
    conversion: Math.round(user.conversionRate)
  }));

  const pieData = Object.values(salesByUser).map((user: any) => ({
    name: user.name,
    value: user.totalSales
  }));

  const topPerformer = chartData.length > 0 ? chartData.reduce((prev, current) => 
    (prev.ingresos > current.ingresos) ? prev : current
  ) : null;

  const totalRevenue = chartData.reduce((sum, user) => sum + user.ingresos, 0);
  const avgConversion = chartData.length > 0 
    ? chartData.reduce((sum, user) => sum + user.conversion, 0) / chartData.length 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Estadísticas por Usuario</CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Métricas principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Vendedores Activos</span>
            </div>
            <div className="text-lg font-bold">{chartData.length}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Ingresos Totales</span>
            </div>
            <div className="text-lg font-bold">₲{totalRevenue.toLocaleString()}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Conversión Promedio</span>
            </div>
            <div className="text-lg font-bold">{avgConversion.toFixed(1)}%</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Top Performer</span>
            </div>
            <div className="text-sm font-bold truncate">{topPerformer?.name || 'N/A'}</div>
          </div>
        </div>

        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bar">Ventas</TabsTrigger>
            <TabsTrigger value="revenue">Ingresos</TabsTrigger>
            <TabsTrigger value="distribution">Distribución</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="ventas" 
                    fill="hsl(var(--primary))"
                    name="Total Ventas"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="completadas" 
                    fill="hsl(var(--secondary))"
                    name="Ventas Completadas"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="revenue" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₲${(value / 1000)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: any) => [`₲${value.toLocaleString()}`, 'Ingresos']}
                  />
                  <Bar 
                    dataKey="ingresos" 
                    fill="hsl(var(--chart-1))"
                    name="Ingresos"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="distribution" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#1e3a5f"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SalesByUserWidget;