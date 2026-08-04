import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommissionPeriods } from '@/hooks/useCommissions';
import { formatDateOnly } from '@/lib/dateOnly';
import { formatCommissionCurrency } from '@/lib/commissionCurrency';
import { commissionPersonName, type CommissionPeriodStatus } from '@/types/commissions';

const statusVariant: Record<CommissionPeriodStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  borrador: 'secondary', cerrada: 'default', pagada: 'outline', anulada: 'destructive',
};

export function CommissionPeriodList() {
  const periods = useCommissionPeriods();
  if (periods.isLoading) return <div className="py-10 text-center text-muted-foreground">Cargando liquidaciones...</div>;
  if (periods.isError) return <div className="py-10 text-center text-destructive">No se pudo cargar el historial de liquidaciones.</div>;
  return <Card><CardHeader><CardTitle>Liquidaciones</CardTitle><CardDescription>Historial de períodos generados y su estado contable.</CardDescription></CardHeader><CardContent>
    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Promotor</TableHead><TableHead>Período</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>
      {(periods.data || []).map((period) => <TableRow key={period.id}><TableCell className="font-medium">{period.liquidation_number}</TableCell><TableCell>{period.salesperson_name || commissionPersonName(period.salesperson)}</TableCell><TableCell>{formatDateOnly(period.period_start)} – {formatDateOnly(period.period_end)}</TableCell><TableCell><Badge variant={statusVariant[period.status]}>{period.status}</Badge></TableCell><TableCell className="text-right">{formatCommissionCurrency(Number(period.total_amount || 0), period.currency_code)}</TableCell><TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to={`/comisiones/${period.id}`}>Ver detalle</Link></Button></TableCell></TableRow>)}
      {!periods.isLoading && !periods.data?.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay liquidaciones disponibles.</TableCell></TableRow>}
    </TableBody></Table></div>
  </CardContent></Card>;
}
