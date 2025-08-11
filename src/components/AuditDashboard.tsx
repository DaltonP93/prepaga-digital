
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuditProcesses, useUpdateAuditProcess, useCreateInformationRequest } from '@/hooks/useAuditProcess';
import { useProcessTraces } from '@/hooks/useProcessTraces';
import { Clock, CheckCircle, XCircle, AlertCircle, MessageSquare, Eye, Users, TrendingUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const AuditDashboard = () => {
  const { data: auditProcesses, isLoading } = useAuditProcesses();
  const updateAuditProcess = useUpdateAuditProcess();
  const createInfoRequest = useCreateInformationRequest();
  
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [infoRequestDescription, setInfoRequestDescription] = useState('');

  const stats = React.useMemo(() => {
    if (!auditProcesses) return { total: 0, pending: 0, inReview: 0, approved: 0, rejected: 0 };
    
    return {
      total: auditProcesses.length,
      pending: auditProcesses.filter(p => p.status === 'pending').length,
      inReview: auditProcesses.filter(p => p.status === 'in_review').length,
      approved: auditProcesses.filter(p => p.status === 'approved').length,
      rejected: auditProcesses.filter(p => p.status === 'rejected').length,
    };
  }, [auditProcesses]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_review': return <AlertCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_review': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleStatusUpdate = (processId: string, newStatus: string) => {
    updateAuditProcess.mutate({
      id: processId,
      status: newStatus,
      notes
    });
    setSelectedProcess(null);
    setNotes('');
  };

  const handleInfoRequest = (processId: string) => {
    createInfoRequest.mutate({
      auditProcessId: processId,
      description: infoRequestDescription
    });
    setInfoRequestDescription('');
  };

  if (isLoading) {
    return <div>Cargando procesos de auditoría...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Revisión</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de procesos de auditoría */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Procesos de Auditoría</h2>
        
        {auditProcesses?.map((process) => (
          <Card key={process.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(process.status)}
                    Cliente: {process.sale?.clients?.first_name} {process.sale?.clients?.last_name}
                  </CardTitle>
                  <CardDescription>
                    Plan: {process.sale?.plans?.name} - ${process.sale?.plans?.price}
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(process.status) as any}>
                  {process.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Auditor</p>
                    <p className="text-sm text-muted-foreground">
                      {process.auditor?.first_name} {process.auditor?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vendedor</p>
                    <p className="text-sm text-muted-foreground">
                      {process.sale?.salesperson?.first_name} {process.sale?.salesperson?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Fecha de Creación</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(process.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {process.notes && (
                  <div>
                    <p className="text-sm font-medium">Notas</p>
                    <p className="text-sm text-muted-foreground">{process.notes}</p>
                  </div>
                )}

                {/* Solicitudes de información */}
                {process.information_requests && process.information_requests.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ver solicitudes de información ({process.information_requests.length})
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {process.information_requests.map((request) => (
                        <Card key={request.id} className="p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-medium">Solicitud de información</p>
                              <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.description}</p>
                            
                            {request.information_responses && request.information_responses.length > 0 && (
                              <div className="mt-2 p-2 bg-muted rounded">
                                <p className="text-sm font-medium">Respuesta:</p>
                                {request.information_responses.map((response) => (
                                  <div key={response.id} className="mt-1">
                                    <p className="text-sm">{response.response}</p>
                                    {response.document_url && (
                                      <a 
                                        href={response.document_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline"
                                      >
                                        Ver documento adjunto
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-2">
                  {process.status === 'pending' || process.status === 'in_review' ? (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprobar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aprobar Proceso</DialogTitle>
                            <DialogDescription>
                              ¿Estás seguro de que quieres aprobar este proceso de auditoría?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Notas adicionales (opcional)"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                            <Button 
                              onClick={() => handleStatusUpdate(process.id, 'approved')}
                              className="w-full"
                            >
                              Confirmar Aprobación
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <XCircle className="h-4 w-4 mr-2" />
                            Rechazar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rechazar Proceso</DialogTitle>
                            <DialogDescription>
                              Proporciona una razón para el rechazo
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Motivo del rechazo"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              required
                            />
                            <Button 
                              onClick={() => handleStatusUpdate(process.id, 'rejected')}
                              variant="destructive"
                              className="w-full"
                              disabled={!notes.trim()}
                            >
                              Confirmar Rechazo
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Solicitar Información
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Solicitar Información Adicional</DialogTitle>
                            <DialogDescription>
                              Describe qué información necesitas del vendedor
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Describe la información que necesitas"
                              value={infoRequestDescription}
                              onChange={(e) => setInfoRequestDescription(e.target.value)}
                              required
                            />
                            <Button 
                              onClick={() => handleInfoRequest(process.id)}
                              className="w-full"
                              disabled={!infoRequestDescription.trim()}
                            >
                              Enviar Solicitud
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : null}

                  <ProcessTraceViewer saleId={process.sale_id} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ProcessTraceViewer = ({ saleId }: { saleId: string }) => {
  const { data: traces } = useProcessTraces(saleId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Ver Trazabilidad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Trazabilidad del Proceso</DialogTitle>
          <DialogDescription>
            Historial completo de acciones realizadas en esta venta
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {traces?.map((trace) => (
            <div key={trace.id} className="flex items-start space-x-3 p-3 border rounded">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{trace.action.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {trace.client_action ? 'Acción del cliente' : 
                       trace.performed_by_user ? 
                       `${trace.performed_by_user.first_name} ${trace.performed_by_user.last_name} (${trace.performed_by_user.role})` : 
                       'Sistema'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(trace.created_at).toLocaleString()}
                  </span>
                </div>
                {trace.details && Object.keys(trace.details).length > 0 && (
                  <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(trace.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuditDashboard;
