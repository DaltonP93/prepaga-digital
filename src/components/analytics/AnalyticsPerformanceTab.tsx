import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Trophy, Medal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsData } from '@/hooks/useAdvancedAnalytics';

interface AnalyticsPerformanceTabProps {
  data: AnalyticsData['performanceByUser'];
}

const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
const MEDAL_BG = ['bg-yellow-500/10', 'bg-slate-400/10', 'bg-amber-600/10'];

export const AnalyticsPerformanceTab: React.FC<AnalyticsPerformanceTabProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranking de Vendedores
          </CardTitle>
          <CardDescription>Top vendedores por cantidad de ventas y conversión</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((user, idx) => (
              <div
                key={user.userId}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  idx < 3 ? MEDAL_BG[idx] : 'bg-muted/30'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {idx < 3 ? (
                    <Medal className={`h-6 w-6 ${MEDAL_COLORS[idx]}`} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(user.revenue)} en ingresos
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {user.ventas} ventas
                  </Badge>
                  <Badge
                    variant={user.conversion >= 50 ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {user.conversion}% conv.
                  </Badge>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos de vendedores para el periodo seleccionado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bar chart */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ventas y Conversión por Vendedor</CardTitle>
            <CardDescription>Comparativa visual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'ventas' ? `${value} ventas` : `${value}%`,
                    name === 'ventas' ? 'Ventas' : 'Conversión',
                  ]}
                />
                <Bar dataKey="ventas" fill="#1e3a5f" name="ventas" />
                <Bar dataKey="conversion" fill="#3b82f6" name="conversion" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
