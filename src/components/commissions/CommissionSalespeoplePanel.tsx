import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommissionCatalog, useCommissionSalespeople, useSaveCommissionSalesperson } from '@/hooks/useCommissions';
import { commissionPersonName } from '@/types/commissions';

export function CommissionSalespeoplePanel() {
  const catalog = useCommissionCatalog();
  const configs = useCommissionSalespeople();
  const save = useSaveCommissionSalesperson();
  const [salespersonId, setSalespersonId] = useState('');
  if (catalog.isLoading || configs.isLoading) return <div className="py-8 text-center text-muted-foreground">Cargando vendedores...</div>;
  if (catalog.isError || configs.isError) return <div className="py-8 text-center text-destructive">No se pudo cargar la configuración de vendedores.</div>;
  return <Card><CardHeader><CardTitle>Vendedores que comisionan</CardTitle><CardDescription>Habilitá los vendedores que deben liquidarse. Solo los activos aquí entran en una liquidación.</CardDescription></CardHeader><CardContent className="space-y-5">
    <div className="grid gap-4 md:grid-cols-[1fr_auto]"><div className="space-y-2"><Label>Vendedor</Label><Select value={salespersonId} onValueChange={setSalespersonId}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{catalog.data?.profiles.map((p) => <SelectItem key={p.id} value={p.id}>{commissionPersonName(p)}</SelectItem>)}</SelectContent></Select></div><div className="flex items-end"><Button disabled={!salespersonId || save.isPending} onClick={() => save.mutate({ salesperson_id: salespersonId, is_active: true })}>Habilitar vendedor</Button></div></div>
    <Table><TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead>Email</TableHead><TableHead>Activo</TableHead></TableRow></TableHeader><TableBody>{(configs.data || []).map((row) => <TableRow key={row.salesperson_id}><TableCell>{row.display_name}</TableCell><TableCell className="text-muted-foreground">{row.email || '—'}</TableCell><TableCell><Switch checked={row.is_active} disabled={save.isPending} onCheckedChange={(is_active) => save.mutate({ salesperson_id: row.salesperson_id, is_active })} /></TableCell></TableRow>)}</TableBody></Table>
  </CardContent></Card>;
}
