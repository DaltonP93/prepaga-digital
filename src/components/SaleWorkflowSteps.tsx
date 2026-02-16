import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProcessTraces } from '@/hooks/useProcessTraces';
import { useSignatureLinks } from '@/hooks/useSignatureLinks';
import {
  FileText, UserCheck, ClipboardCheck, Send, PenTool,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight,
  Loader2,
} from 'lucide-react';

interface SaleWorkflowStepsProps {
  sale: any;
  saleId: string;
}

// Define the expected workflow steps in order
const WORKFLOW_STEPS = [
  { key: 'borrador', label: 'Borrador', description: 'Venta creada', icon: FileText },
  { key: 'preparando_documentos', label: 'Documentos', description: 'Preparando documentación', icon: FileText },
  { key: 'esperando_ddjj', label: 'DDJJ', description: 'Esperando declaración jurada', icon: ClipboardCheck },
  { key: 'en_revision', label: 'Auditoría', description: 'En revisión por auditor', icon: UserCheck },
  { key: 'aprobado_para_templates', label: 'Templates', description: 'Aprobado, seleccionando templates', icon: FileText },
  { key: 'listo_para_enviar', label: 'Listo', description: 'Documentos listos para envío', icon: Send },
  { key: 'enviado', label: 'Enviado', description: 'Enviado para firma', icon: Send },
  { key: 'firmado', label: 'Firmado', description: 'Firma completada', icon: PenTool },
  { key: 'completado', label: 'Completado', description: 'Proceso finalizado', icon: CheckCircle2 },
];

const STATUS_ORDER: Record<string, number> = {};
WORKFLOW_STEPS.forEach((step, i) => { STATUS_ORDER[step.key] = i; });

function getStepState(stepKey: string, currentStatus: string): 'completed' | 'current' | 'pending' | 'rejected' {
  if (currentStatus === 'rechazado') {
    // If rejected, mark up to en_revision as completed, en_revision as rejected
    if (stepKey === 'en_revision') return 'rejected';
    if ((STATUS_ORDER[stepKey] ?? 99) < (STATUS_ORDER['en_revision'] ?? 3)) return 'completed';
    return 'pending';
  }
  if (currentStatus === 'cancelado') {
    return 'pending';
  }
  const currentIdx = STATUS_ORDER[currentStatus] ?? -1;
  const stepIdx = STATUS_ORDER[stepKey] ?? 99;
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

const ACTION_LABELS: Record<string, string> = {
  'venta_creada': 'Venta creada',
  'documentos_cargados': 'Documentos cargados',
  'ddjj_completada': 'DDJJ completada',
  'enviado_a_auditoria': 'Enviado a auditoría',
  'aprobado': 'Aprobado por auditor',
  'rechazado': 'Rechazado por auditor',
  'templates_seleccionados': 'Templates seleccionados',
  'documentos_generados': 'Documentos generados',
  'enlace_firma_creado': 'Enlace de firma creado',
  'firma_completada': 'Firma completada',
  'venta_completada': 'Venta completada',
  'estado_actualizado': 'Estado actualizado',
  'cambio_estado': 'Cambio de estado',
};

export const SaleWorkflowSteps: React.FC<SaleWorkflowStepsProps> = ({ sale, saleId }) => {
  const { data: traces, isLoading: tracesLoading } = useProcessTraces(saleId);
  const { data: signatureLinks } = useSignatureLinks(saleId);

  const currentStatus = sale.status || 'borrador';

  return (
    <div className="space-y-6">
      {/* Visual Step Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Progreso del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStatus === 'rechazado' && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Venta rechazada — requiere correcciones del vendedor
              </span>
            </div>
          )}
          {currentStatus === 'cancelado' && (
            <div className="mb-4 p-3 bg-muted border rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Venta cancelada
              </span>
            </div>
          )}

          <div className="relative">
            {WORKFLOW_STEPS.map((step, index) => {
              const state = getStepState(step.key, currentStatus);
              const Icon = step.icon;
              const isLast = index === WORKFLOW_STEPS.length - 1;

              return (
                <div key={step.key} className="flex items-start gap-4 relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`absolute left-5 top-10 w-0.5 h-full -translate-x-1/2 ${
                        state === 'completed' ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}

                  {/* Step circle */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      state === 'completed'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : state === 'current'
                        ? 'bg-primary/10 border-primary text-primary'
                        : state === 'rejected'
                        ? 'bg-destructive/10 border-destructive text-destructive'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {state === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : state === 'rejected' ? (
                      <XCircle className="h-5 w-5" />
                    ) : state === 'current' ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className={`pb-8 flex-1 ${isLast ? 'pb-0' : ''}`}>
                    <p
                      className={`font-medium text-sm ${
                        state === 'completed'
                          ? 'text-foreground'
                          : state === 'current'
                          ? 'text-primary font-semibold'
                          : state === 'rejected'
                          ? 'text-destructive font-semibold'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                      {state === 'current' && (
                        <Badge variant="outline" className="ml-2 text-xs border-primary text-primary">
                          Actual
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Signature Links Status */}
      {signatureLinks && signatureLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenTool className="h-5 w-5" />
              Estado de Firmas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signatureLinks.map((link: any) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        link.status === 'completado'
                          ? 'bg-green-500'
                          : link.status === 'pendiente'
                          ? 'bg-amber-500'
                          : link.status === 'revocado'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {link.recipient_type === 'titular' ? 'Titular' : 'Adherente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {link.recipient_email || link.recipient_phone || 'Sin contacto'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      link.status === 'completado'
                        ? 'default'
                        : link.status === 'pendiente'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {link.status === 'completado'
                      ? 'Firmado'
                      : link.status === 'pendiente'
                      ? 'Pendiente'
                      : link.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tracesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando historial...</span>
            </div>
          ) : !traces || traces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay actividad registrada aún.</p>
          ) : (
            <div className="space-y-3">
              {traces.map((trace: any, index: number) => (
                <div key={trace.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {ACTION_LABELS[trace.action] || trace.action}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {new Date(trace.created_at).toLocaleString('es-PY', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {trace.user && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {trace.user.first_name} {trace.user.last_name}
                          </span>
                        </>
                      )}
                    </div>
                    {trace.details && Object.keys(trace.details).length > 0 && trace.details.comentario && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{trace.details.comentario}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
