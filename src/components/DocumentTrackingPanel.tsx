
import React from 'react';
import { useDocumentTracking } from '@/hooks/useDocumentTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Eye, CheckCircle, Smartphone, Monitor, Tablet } from 'lucide-react';

interface DocumentTrackingPanelProps {
  saleId: string;
}

export const DocumentTrackingPanel: React.FC<DocumentTrackingPanelProps> = ({ saleId }) => {
  const { trackingRecords, isLoading, stats } = useDocumentTracking(saleId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Cargando estadísticas...</div>
        </CardContent>
      </Card>
    );
  }

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'viewed': 'bg-blue-100 text-blue-800',
      'started': 'bg-yellow-100 text-yellow-800',
      'progress': 'bg-orange-100 text-orange-800',
      'completed': 'bg-green-100 text-green-800',
      'signed': 'bg-purple-100 text-purple-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'viewed': 'Visualizado',
      'started': 'Iniciado',
      'progress': 'En Progreso',
      'completed': 'Completado',
      'signed': 'Firmado',
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Vistas</p>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completados</p>
                  <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Firmados</p>
                  <p className="text-2xl font-bold">{stats.totalSigned}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progreso Promedio</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averageProgress)}%</p>
                </div>
                <div className="h-8 w-8">
                  <Progress value={stats.averageProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historial de actividad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trackingRecords && trackingRecords.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {trackingRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(record.device_type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(record.action)}>
                          {getActionLabel(record.action)}
                        </Badge>
                        <span className="text-sm font-medium">{record.document_type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(record.access_time).toLocaleString()}
                      </div>
                      {record.progress_percentage > 0 && (
                        <div className="mt-1">
                          <Progress value={record.progress_percentage} className="h-1 w-24" />
                          <span className="text-xs text-muted-foreground">
                            {record.progress_percentage}% completado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-muted-foreground">
                    {record.device_os && (
                      <div>{record.device_os}</div>
                    )}
                    {record.browser && (
                      <div>{record.browser}</div>
                    )}
                    {record.ip_address && (
                      <div>IP: {record.ip_address}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay actividad registrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
