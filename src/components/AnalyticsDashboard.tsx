import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Activity, Clock, FileCheck } from "lucide-react";
import { useTemplateAnalytics } from "@/hooks/useTemplateAnalytics";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AnalyticsDashboardProps {
  templateId: string;
}

export const AnalyticsDashboard = ({ templateId }: AnalyticsDashboardProps) => {
  const { metrics, isLoadingAnalytics } = useTemplateAnalytics(templateId);

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

  if (!metrics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin datos analíticos</h3>
          <p className="text-muted-foreground">
            Los datos analíticos se registrarán cuando se use el template
          </p>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Visualizaciones",
      value: metrics.totalViews,
      icon: Eye,
      color: "text-blue-600",
    },
    {
      title: "Completados",
      value: metrics.totalCompletions,
      icon: FileCheck,
      color: "text-green-600",
    },
    {
      title: "Tiempo Promedio",
      value: metrics.avgCompletionTime
        ? `${Math.round(metrics.avgCompletionTime / 1000 / 60)} min`
        : "N/A",
      icon: Clock,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Last Used */}
      {metrics.lastUsedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Última Actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Último uso:{" "}
              {formatDistanceToNow(new Date(metrics.lastUsedAt), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
