import { Badge } from '@/components/ui/badge';
import { IncidentPriority, IncidentStatus, PRIORITY_LABELS, STATUS_LABELS } from '@/hooks/useIncidents';

const STATUS_STYLES: Record<IncidentStatus, string> = {
  nuevo: 'bg-blue-100 text-blue-800 border-blue-200',
  analisis: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pendiente_aprobacion: 'bg-amber-100 text-amber-800 border-amber-300',
  pendiente_desarrollo: 'bg-sky-100 text-sky-800 border-sky-300',
  desarrollo: 'bg-orange-100 text-orange-800 border-orange-200',
  estabilizacion: 'bg-purple-100 text-purple-800 border-purple-200',
  resuelto: 'bg-green-100 text-green-800 border-green-200',
};

const PRIORITY_STYLES: Record<IncidentPriority, string> = {
  baja: 'bg-gray-100 text-gray-700 border-gray-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  critica: 'bg-red-100 text-red-700 border-red-200',
};

export const IncidentStatusBadge = ({ status }: { status: IncidentStatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

export const IncidentPriorityBadge = ({ priority }: { priority: IncidentPriority }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_STYLES[priority]}`}>
    {PRIORITY_LABELS[priority]}
  </span>
);
