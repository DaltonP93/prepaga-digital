
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, HeartPulse, CheckCircle, Clock } from 'lucide-react';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';

interface SaleDDJJTabProps {
  saleId?: string;
}

const SaleDDJJTab: React.FC<SaleDDJJTabProps> = ({ saleId }) => {
  const { data: beneficiaries, isLoading } = useBeneficiaries(saleId || '');

  if (!saleId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guarde la venta primero</h3>
        <p className="text-muted-foreground">
          Debe guardar la venta antes de gestionar las DDJJ de Salud.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando datos de salud...</div>;
  }

  const allBeneficiaries = beneficiaries || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Declaraciones Juradas de Salud</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Estado de las declaraciones juradas de salud del titular y cada adherente.
      </p>

      {allBeneficiaries.length > 0 ? (
        <div className="space-y-3">
          {allBeneficiaries.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  {b.has_preexisting_conditions ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <div className="font-medium">{b.first_name} {b.last_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {b.relationship || 'Titular'} {b.dni ? `• DNI: ${b.dni}` : ''}
                    </div>
                    {b.has_preexisting_conditions && b.preexisting_conditions_detail && (
                      <div className="text-sm text-destructive mt-1">
                        Preexistencias: {b.preexisting_conditions_detail}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={b.has_preexisting_conditions ? 'secondary' : 'default'}>
                  {b.has_preexisting_conditions ? 'Con preexistencias' : 'Sin preexistencias'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2" />
          No hay adherentes registrados. Agregue adherentes en la pestaña correspondiente para ver sus DDJJ de salud.
        </div>
      )}
    </div>
  );
};

export default SaleDDJJTab;
