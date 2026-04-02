import React from 'react';
import { useWahaHealthCheck } from '@/hooks/useWahaHealthCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  WORKING: { color: 'bg-green-600', icon: CheckCircle, label: 'Conectado' },
  STOPPED: { color: 'bg-destructive', icon: XCircle, label: 'Detenido' },
  FAILED: { color: 'bg-destructive', icon: XCircle, label: 'Error' },
  SCAN_QR_CODE: { color: 'bg-yellow-500', icon: AlertTriangle, label: 'Escanear QR' },
  UNKNOWN: { color: 'bg-muted', icon: Clock, label: 'Desconocido' },
};

const getStatusInfo = (status: string) =>
  statusConfig[status] || statusConfig.UNKNOWN;

export const WahaHealthStatus: React.FC = () => {
  const { healthLogs, latestStatus, isLoading, checkNow, isChecking } = useWahaHealthCheck();

  const statusInfo = latestStatus ? getStatusInfo(latestStatus.session_status) : null;
  const StatusIcon = statusInfo?.icon || Clock;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Estado de Sesión WAHA
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkNow()}
          disabled={isChecking}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Verificando...' : 'Verificar ahora'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : latestStatus ? (
          <div className="flex items-center gap-3">
            <Badge className={`${statusInfo?.color} text-white`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo?.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(latestStatus.checked_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>
            {latestStatus.response_time_ms != null && (
              <span className="text-xs text-muted-foreground">
                ({latestStatus.response_time_ms}ms)
              </span>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Sin datos. Ejecute una verificación manual.
          </div>
        )}

        {/* Error message */}
        {latestStatus?.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
            {latestStatus.error_message}
          </div>
        )}

        {/* Recent History */}
        {healthLogs.length > 1 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Historial reciente</div>
            <div className="space-y-1">
              {healthLogs.slice(1, 6).map((log) => {
                const info = getStatusInfo(log.session_status);
                const LogIcon = info.icon;
                return (
                  <div key={log.id} className="flex items-center gap-2 text-xs">
                    <LogIcon className={`h-3 w-3 ${
                      log.session_status === 'WORKING' ? 'text-green-600' : 'text-destructive'
                    }`} />
                    <span className="text-muted-foreground">
                      {info.label}
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(log.checked_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
