import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Download,
  Users, DollarSign, Target, GitCompareArrows,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

import { useAdvancedAnalytics, useComparisonAnalytics, type DateRange } from '@/hooks/useAdvancedAnalytics';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { useAnalyticsConfig } from '@/hooks/useAnalyticsConfig';

import { AnalyticsDateRangePicker } from '@/components/analytics/AnalyticsDateRangePicker';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { AnalyticsCustomizer } from '@/components/analytics/AnalyticsCustomizer';
import { ComparisonKpiCard } from '@/components/analytics/ComparisonKpiCard';
import { AnalyticsPerformanceTab } from '@/components/analytics/AnalyticsPerformanceTab';

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const AdvancedAnalytics = () => {
  // Date range state with default 6 months
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = useState<string | null>('6m');
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Hooks
  const filterState = useAnalyticsFilters();
  const { analyticsConfig } = useAnalyticsConfig();
  const { data: analytics, isLoading, error } = useAdvancedAnalytics(dateRange, filterState.filters);
  const { data: prevAnalytics } = useComparisonAnalytics(dateRange, filterState.filters, compareEnabled);

  // Visible tabs (filtered by config)
  const visibleTabs = useMemo(() => {
    const tabs: Array<{ value: string; label: string }> = [];
    if (analyticsConfig.tabs.trends) tabs.push({ value: 'trends', label: 'Tendencias' });
    if (analyticsConfig.tabs.conversion) tabs.push({ value: 'conversion', label: 'Conversión' });
    if (analyticsConfig.tabs.performance) tabs.push({ value: 'performance', label: 'Performance' });
    if (analyticsConfig.tabs.products) tabs.push({ value: 'products', label: 'Productos' });
    return tabs;
  }, [analyticsConfig.tabs]);

  const exportData = () => {
    if (!analytics) return;

    const exportObj = {
      periodo: `${format(dateRange.from, 'yyyy-MM-dd')} a ${format(dateRange.to, 'yyyy-MM-dd')}`,
      fecha_exportacion: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      kpis: analytics.kpis,
      tendencia_ventas: analytics.salesTrend,
      top_planes: analytics.topPlans,
      performance_usuarios: analytics.performanceByUser,
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(dateRange.from, 'yyyyMMdd')}-${format(dateRange.to, 'yyyyMMdd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
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
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded w-1/2" />
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

  const kpis = analytics.kpis;
  const prevKpis = prevAnalytics?.kpis;
  const showDelta = compareEnabled && !!prevKpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Análisis Avanzado</h2>
            <p className="text-muted-foreground">Métricas detalladas y tendencias de negocio</p>
          </div>
          <div className="flex items-center gap-2">
            <AnalyticsCustomizer />
            <Button variant="outline" size="sm" onClick={exportData} className="h-8 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Date range picker */}
        <AnalyticsDateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
        />

        {/* Filters + Compare toggle */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <AnalyticsFilterBar filterState={filterState} />
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="compare-toggle" className="text-xs cursor-pointer">
              Comparar periodo anterior
            </Label>
            <Switch
              id="compare-toggle"
              checked={compareEnabled}
              onCheckedChange={setCompareEnabled}
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <ComparisonKpiCard
          title="Tasa de Conversión"
          value={`${kpis.conversionRate}%`}
          previousValue={showDelta ? `${prevKpis.conversionRate}%` : undefined}
          delta={showDelta ? calcDelta(kpis.conversionRate, prevKpis.conversionRate) : undefined}
          description="De leads a ventas cerradas"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          visible={analyticsConfig.kpis.conversionRate}
        />
        <ComparisonKpiCard
          title="Ticket Promedio"
          value={formatCurrency(kpis.avgTicket)}
          previousValue={showDelta ? formatCurrency(prevKpis.avgTicket) : undefined}
          delta={showDelta ? calcDelta(kpis.avgTicket, prevKpis.avgTicket) : undefined}
          description="Por venta completada"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          visible={analyticsConfig.kpis.avgTicket}
        />
        <ComparisonKpiCard
          title="Valor Vitalicio"
          value={formatCurrency(kpis.customerLifetime)}
          previousValue={showDelta ? formatCurrency(prevKpis.customerLifetime) : undefined}
          delta={showDelta ? calcDelta(kpis.customerLifetime, prevKpis.customerLifetime) : undefined}
          description="Promedio por cliente"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          visible={analyticsConfig.kpis.customerLifetime}
        />
        <ComparisonKpiCard
          title="Tasa de Churn"
          value={`${kpis.churnRate}%`}
          previousValue={showDelta ? `${prevKpis.churnRate}%` : undefined}
          delta={showDelta ? calcDelta(kpis.churnRate, prevKpis.churnRate) : undefined}
          description="Ventas canceladas"
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
          visible={analyticsConfig.kpis.churnRate}
        />
        <ComparisonKpiCard
          title="MRR"
          value={formatCurrency(kpis.monthlyRecurring)}
          previousValue={showDelta ? formatCurrency(prevKpis.monthlyRecurring) : undefined}
          delta={showDelta ? calcDelta(kpis.monthlyRecurring, prevKpis.monthlyRecurring) : undefined}
          description="Ingresos recurrentes"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          visible={analyticsConfig.kpis.monthlyRecurring}
        />
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">Total: {kpis.totalSales} ventas</Badge>
        <Badge variant="outline">Completadas: {kpis.completedSales}</Badge>
        <Badge variant="outline">Ingresos: {formatCurrency(kpis.totalRevenue)}</Badge>
        {filterState.hasActiveFilters && (
          <Badge variant="secondary">Filtros activos</Badge>
        )}
      </div>

      {/* Charts */}
      {visibleTabs.length > 0 && (
        <Tabs defaultValue={visibleTabs[0]?.value} className="space-y-4">
          <TabsList>
            {visibleTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {analyticsConfig.tabs.trends && (
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
                        <Tooltip formatter={(value: number, name: string) => [
                          name === 'ventas' ? `${value} ventas` : formatCurrency(value),
                          name === 'ventas' ? 'Ventas' : 'Ingresos',
                        ]} />
                        <Area type="monotone" dataKey="ventas" stackId="1" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="ingresos" stackId="2" stroke="#475569" fill="#475569" fillOpacity={0.6} />
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
                        <Tooltip formatter={(value: number) => [`${value} días`, 'Tiempo promedio']} />
                        <Line type="monotone" dataKey="avgDays" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {analyticsConfig.tabs.conversion && (
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
                        <Funnel dataKey="value" data={analytics.conversionFunnel} isAnimationActive>
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
                        <Bar dataKey="ventas" fill="#1e3a5f" />
                        <Bar dataKey="ingresos" fill="#475569" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {analyticsConfig.tabs.performance && (
            <TabsContent value="performance" className="space-y-4">
              <AnalyticsPerformanceTab data={analytics.performanceByUser} />
            </TabsContent>
          )}

          {analyticsConfig.tabs.products && (
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
                        <Tooltip formatter={(value: number, name: string) => [
                          name === 'count' ? `${value} ventas` : formatCurrency(value),
                          name === 'count' ? 'Cantidad' : 'Ingresos',
                        ]} />
                        <Bar dataKey="revenue" fill="#1e3a5f" />
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
                          fill="#1e3a5f"
                          dataKey="count"
                        >
                          {analytics.topPlans.map((_entry, index) => (
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
          )}
        </Tabs>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
