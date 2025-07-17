import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDocumentTracking } from '@/hooks/useDocumentTracking';
import { Eye, Check, FileSignature, Smartphone, Monitor, Tablet } from 'lucide-react';

interface DocumentTrackingPanelProps {
  documentId: string;
}

export const DocumentTrackingPanel = ({ documentId }: DocumentTrackingPanelProps) => {
  const { accessLogs, stats, isLoadingLogs, isLoadingStats } = useDocumentTracking(documentId);

  const ACTION_LABELS = {
    viewed: 'Visualizado',
    started: 'Iniciado',
    completed: 'Completado',
    signed: 'Firmado',
  };

const ACTION_VARIANTS = {
    viewed: 'outline' as const,
    started: 'secondary' as const,
    completed: 'default' as const,
    signed: 'default' as const,
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoadingLogs || isLoadingStats) {
    return <div>Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Eye className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats?.views || 0}</p>
              <p className="text-sm text-muted-foreground">Vistas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Check className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats?.completions || 0}</p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <FileSignature className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats?.signatures || 0}</p>
              <p className="text-sm text-muted-foreground">Firmados</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Smartphone className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats?.deviceTypes?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Dispositivos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de accesos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Accesos</CardTitle>
          <CardDescription>
            Registro detallado de todas las interacciones con el documento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(log.access_time).toLocaleString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANTS[log.action as keyof typeof ACTION_VARIANTS] || 'outline'}>
                      {ACTION_LABELS[log.action as keyof typeof ACTION_LABELS] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(log.device_type || 'desktop')}
                      <span className="capitalize">{log.device_type || 'Desktop'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {String(log.ip_address) || 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.user_agent || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              {(!accessLogs || accessLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay registros de acceso para este documento
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};