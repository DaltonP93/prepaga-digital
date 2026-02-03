import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuditLogs, useAuthAttempts } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shield, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AuditLogViewer = () => {
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();
  const { data: authAttempts, isLoading: authLoading } = useAuthAttempts();

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'modify':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800';
      case 'select':
      case 'view':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const formatJsonValue = (value: any) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Sistema de Auditoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs de Auditoría
            </TabsTrigger>
            <TabsTrigger value="auth" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Intentos de Acceso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-4">
            <ScrollArea className="h-96">
              {auditLoading ? (
                <div className="text-center py-8">Cargando logs...</div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getActionColor(log.action)}>
                              {log.action.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{log.entity_type || 'N/A'}</span>
                            <span className="text-sm text-muted-foreground">
                              {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : 'N/A'}
                            </span>
                          </div>
                          
                          {log.user_id && (
                            <div className="text-sm text-muted-foreground">
                              Usuario ID: {log.user_id}
                            </div>
                          )}
                          
                          {log.ip_address && (
                            <div className="text-sm text-muted-foreground">
                              IP: {log.ip_address}
                            </div>
                          )}
                          
                          {(log.old_values || log.new_values) && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">
                                Ver detalles de cambios
                              </summary>
                              <div className="mt-2 space-y-2">
                                {log.old_values && (
                                  <div>
                                    <strong>Valores anteriores:</strong>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                      {formatJsonValue(log.old_values)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_values && (
                                  <div>
                                    <strong>Valores nuevos:</strong>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                      {formatJsonValue(log.new_values)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay logs de auditoría disponibles
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="auth" className="space-y-4">
            <ScrollArea className="h-96">
              {authLoading ? (
                <div className="text-center py-8">Cargando intentos de acceso...</div>
              ) : authAttempts && authAttempts.length > 0 ? (
                <div className="space-y-3">
                  {authAttempts.map((attempt: any) => (
                    <Card key={attempt.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {attempt.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">{attempt.email}</span>
                            <Badge variant={attempt.success ? 'default' : 'destructive'}>
                              {attempt.success ? 'Exitoso' : 'Fallido'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {attempt.created_at ? format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : 'N/A'}
                          </div>
                          {attempt.failure_reason && (
                            <div className="text-sm text-red-600">
                              Razón: {attempt.failure_reason}
                            </div>
                          )}
                          {attempt.ip_address && (
                            <div className="text-xs text-muted-foreground">
                              IP: {attempt.ip_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay intentos de acceso registrados
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
