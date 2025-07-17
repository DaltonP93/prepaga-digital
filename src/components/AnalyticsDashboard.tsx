import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Eye,
  Edit,
  FileDown,
  Share,
  Copy,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTemplateAnalytics } from "@/hooks/useTemplateAnalytics";

interface AnalyticsDashboardProps {
  templateId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsDashboard = ({ templateId }: AnalyticsDashboardProps) => {
  const { metrics, isLoadingAnalytics } = useTemplateAnalytics(templateId, 30);

  if (isLoadingAnalytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const statCards = [
    {
      title: "Visualizaciones",
      value: metrics.totalViews,
      icon: Eye,
      color: "text-blue-600",
    },
    {
      title: "Ediciones",
      value: metrics.totalEdits,
      icon: Edit,
      color: "text-green-600",
    },
    {
      title: "PDFs Generados",
      value: metrics.totalPDFsGenerated,
      icon: FileDown,
      color: "text-purple-600",
    },
    {
      title: "Compartidos",
      value: metrics.totalShares,
      icon: Share,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Diaria (Últimos 30 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="views" fill="#3b82f6" name="Visualizaciones" />
              <Bar dataKey="edits" fill="#10b981" name="Ediciones" />
              <Bar dataKey="pdf_generated" fill="#8b5cf6" name="PDFs" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Event Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribución de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.eventTrends.map((trend, index) => (
                <div key={trend.event_type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{trend.event_type.replace('_', ' ')}</span>
                    <span>{trend.percentage}%</span>
                  </div>
                  <Progress value={trend.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios Más Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topUsers.slice(0, 5).map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="text-sm">{user.user_name}</span>
                  </div>
                  <Badge variant="secondary">{user.event_count} eventos</Badge>
                </div>
              ))}
              {metrics.topUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay datos de usuarios disponibles
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};