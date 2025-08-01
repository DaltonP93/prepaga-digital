
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SaleDetailsProps {
  sale: any;
}

export const SaleDetails: React.FC<SaleDetailsProps> = ({ sale }) => {
  const getStatusBadge = (status: string) => {
    const statusColors = {
      'borrador': 'default',
      'enviado': 'secondary',
      'firmado': 'default',
      'completado': 'default',
      'cancelado': 'destructive'
    };

    return (
      <Badge variant={statusColors[status as keyof typeof statusColors] || 'default'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>Detalles básicos de la venta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Estado</label>
            <div className="mt-1">
              {getStatusBadge(sale.status)}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Número de Contrato</label>
            <p className="text-sm">{sale.contract_number || 'No asignado'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
            <p className="text-sm">{new Date(sale.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Vendedor</label>
            <p className="text-sm">
              {sale.salesperson ? 
                `${sale.salesperson.first_name} ${sale.salesperson.last_name}` : 
                'No asignado'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan y Cliente</CardTitle>
          <CardDescription>Información del plan y cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Cliente</label>
            <p className="text-sm">
              {sale.clients ? 
                `${sale.clients.first_name} ${sale.clients.last_name}` : 
                'No asignado'
              }
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Plan</label>
            <p className="text-sm">{sale.plans?.name || 'No asignado'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Precio</label>
            <p className="text-sm">
              {sale.plans?.price ? `$${sale.plans.price.toLocaleString()}` : 'No definido'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Template</label>
            <p className="text-sm">{sale.templates?.name || 'No asignado'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
