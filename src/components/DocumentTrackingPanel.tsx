
import React from 'react';
import { useSales } from '@/hooks/useSales';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, FileText, Send, Eye } from 'lucide-react';

interface DocumentTrackingPanelProps {
  saleId: string;
}

export const DocumentTrackingPanel: React.FC<DocumentTrackingPanelProps> = ({ saleId }) => {
  const { data: sales } = useSales();
  const sale = sales?.find(s => s.id === saleId);

  if (!sale) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No se encontró información de la venta
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'borrador':
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Borrador',
          color: 'bg-gray-100 text-gray-800',
          description: 'Documento en preparación'
        };
      case 'enviado':
        return {
          icon: <Send className="h-4 w-4" />,
          label: 'Enviado',
          color: 'bg-blue-100 text-blue-800',
          description: 'Documento enviado al cliente'
        };
      case 'firmado':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Firmado',
          color: 'bg-green-100 text-green-800',
          description: 'Documento firmado por el cliente'
        };
      case 'completado':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Completado',
          color: 'bg-purple-100 text-purple-800',
          description: 'Proceso completado exitosamente'
        };
      case 'cancelado':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Cancelado',
          color: 'bg-red-100 text-red-800',
          description: 'Documento cancelado'
        };
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          label: 'Desconocido',
          color: 'bg-gray-100 text-gray-800',
          description: 'Estado no definido'
        };
    }
  };

  const statusInfo = getStatusInfo(sale.status || 'borrador');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Fecha de creación:</span>
          <span>{new Date(sale.created_at || '').toLocaleDateString()}</span>
        </div>
        
        {sale.sale_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fecha de venta:</span>
            <span>{new Date(sale.sale_date).toLocaleDateString()}</span>
          </div>
        )}

        {sale.signature_expires_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Vence el:</span>
            <span>{new Date(sale.signature_expires_at).toLocaleDateString()}</span>
          </div>
        )}

        {sale.template_id && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tiene cuestionario asociado</span>
          </div>
        )}

        {sale.signature_token && (
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Token de firma generado</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTrackingPanel;
