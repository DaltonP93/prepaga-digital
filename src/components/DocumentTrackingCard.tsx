
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock,
  CheckCircle2,
  Smartphone,
  Monitor,
  Tablet,
  Eye,
  FileText,
  PenTool
} from "lucide-react";
import { useDocumentTracking } from "@/hooks/useDocumentTracking";

interface DocumentTrackingCardProps {
  saleId: string;
  documentId?: string;
}

export function DocumentTrackingCard({ saleId, documentId }: DocumentTrackingCardProps) {
  const { accessLogs, stats, isLoadingLogs, isLoadingStats } = useDocumentTracking(documentId);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'viewed': return <Eye className="h-4 w-4" />;
      case 'completed': return <FileText className="h-4 w-4" />;
      case 'signed': return <PenTool className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'viewed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'signed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoadingLogs || isLoadingStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas generales */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estadísticas del Documento</CardTitle>
            <CardDescription>
              Resumen de interacciones y progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.views}</div>
                <div className="text-sm text-muted-foreground">Visualizaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completions}</div>
                <div className="text-sm text-muted-foreground">Completados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.signatures}</div>
                <div className="text-sm text-muted-foreground">Firmados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.deviceTypes.length}</div>
                <div className="text-sm text-muted-foreground">Dispositivos</div>
              </div>
            </div>
            
            {stats.deviceTypes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Dispositivos utilizados:</p>
                <div className="flex gap-2">
                  {stats.deviceTypes.map((device, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {getDeviceIcon(device)}
                      {device}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de accesos */}
      {accessLogs && accessLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de Accesos</CardTitle>
            <CardDescription>
              Registro detallado de interacciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accessLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getActionColor(log.action)}>
                      {getActionIcon(log.action)}
                      <span className="ml-1 capitalize">{log.action}</span>
                    </Badge>
                    
                    {log.device_type && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {getDeviceIcon(log.device_type)}
                        <span className="capitalize">{log.device_type}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.access_time).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            
            {accessLogs.length > 10 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Mostrando los 10 accesos más recientes de {accessLogs.length} total
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(!accessLogs || accessLogs.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay registros de acceso para este documento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
