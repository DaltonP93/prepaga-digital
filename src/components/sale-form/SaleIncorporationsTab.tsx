import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, UserPlus, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  useAdherentIncorporations,
  useCreateAdherentIncorporation,
  type IncorporationAdherentInput,
} from '@/hooks/useAdherentIncorporations';

interface SaleIncorporationsTabProps {
  saleId?: string;
  /** Estado del contrato madre: solo se incorpora sobre contratos firmados. */
  saleStatus?: string | null;
}

type Row = IncorporationAdherentInput & { immediate_coverage_ui: '' | 'si' | 'no' };

const emptyRow = (): Row => ({
  first_name: '', last_name: '', dni: '', relationship: '', birth_date: '',
  phone: '', email: '', address: '', barrio: '', city: '', amount: 0,
  entry_date: new Date().toISOString().slice(0, 10),
  immediate_coverage: null,
  immediate_coverage_ui: '',
});

const parseAmount = (v: string) => {
  const digits = v.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};
const showAmount = (v: number) => (v ? v.toLocaleString('es-PY', { maximumFractionDigits: 0 }) : '');

/**
 * "Incorporar Adherente" sobre un contrato ya firmado.
 *
 * No modifica el contrato madre: crea una VENTA-OPERACIÓN aparte con los
 * adherentes nuevos. Desde ahí se genera y se firma el Anexo de Incorporación
 * con el circuito de firma de siempre, y recién cuando termina se suman los
 * adherentes al contrato original.
 */
const SaleIncorporationsTab: React.FC<SaleIncorporationsTabProps> = ({ saleId, saleStatus }) => {
  const navigate = useNavigate();
  const { data: incorporaciones = [], isLoading } = useAdherentIncorporations(saleId);
  const crear = useCreateAdherentIncorporation();

  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  const habilitado = saleStatus === 'firmado' || saleStatus === 'completado';

  if (!saleId) {
    return (
      <p className="text-sm text-muted-foreground">
        Guardá la venta primero para poder incorporar adherentes.
      </p>
    );
  }

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleCrear = async () => {
    const validas = rows.filter((r) => r.first_name.trim() && r.last_name.trim());
    if (!validas.length) {
      toast.error('Cargá al menos un adherente con nombre y apellido.');
      return;
    }
    const sinTelefono = validas.find((r) => !r.phone?.trim());
    if (sinTelefono) {
      toast.error('El teléfono es obligatorio: es por donde le llega el enlace de firma.');
      return;
    }

    const adherentes: IncorporationAdherentInput[] = validas.map(({ immediate_coverage_ui, ...r }) => ({
      ...r,
      birth_date: r.birth_date || null,
      entry_date: r.entry_date || null,
      immediate_coverage:
        immediate_coverage_ui === 'si' ? true : immediate_coverage_ui === 'no' ? false : null,
    }));

    try {
      const res = await crear.mutateAsync({ parentSaleId: saleId, adherents: adherentes });
      setRows([emptyRow()]);
      setShowForm(false);
      // Se abre la operación para generar y enviar a firmar el anexo.
      if (res?.operationSale?.id) navigate(`/sales/${res.operationSale.id}/edit`);
    } catch {
      // El hook ya muestra el error.
    }
  };

  // Una operación puede incorporar varias personas: se agrupan para mostrarlas juntas.
  const porOperacion = incorporaciones.reduce((acc: Record<string, any[]>, inc: any) => {
    (acc[inc.operation_sale_id] ||= []).push(inc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Incorporaciones ({Object.keys(porOperacion).length})
          </h3>
        </div>
        {habilitado && !showForm && (
          <Button type="button" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Incorporar Adherente
          </Button>
        )}
      </div>

      {!habilitado && (
        <div className="flex items-start gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            La incorporación de adherentes está disponible una vez que el contrato está{' '}
            <strong>firmado</strong>. Mientras tanto, agregá los adherentes desde la pestaña
            "Adherentes".
          </span>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva Incorporación</CardTitle>
            <p className="text-sm text-muted-foreground">
              Se genera un Anexo de Incorporación con estas personas. El contrato original no se
              modifica: los adherentes se suman recién cuando el anexo queda firmado.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {rows.map((row, i) => (
              <div key={i} className="rounded-md border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Adherente {i + 1}</span>
                  {rows.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input value={row.first_name} onChange={(e) => updateRow(i, { first_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido *</Label>
                    <Input value={row.last_name} onChange={(e) => updateRow(i, { last_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>C.I. Nº</Label>
                    <Input value={row.dni} onChange={(e) => updateRow(i, { dni: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Nac.</Label>
                    <Input type="date" value={row.birth_date || ''} onChange={(e) => updateRow(i, { birth_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Parentesco</Label>
                    <Select value={row.relationship} onValueChange={(v) => updateRow(i, { relationship: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conyuge">Cónyuge</SelectItem>
                        <SelectItem value="hijo">Hijo/a</SelectItem>
                        <SelectItem value="padre">Padre/Madre</SelectItem>
                        <SelectItem value="hermano">Hermano/a</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input type="date" value={row.entry_date || ''} onChange={(e) => updateRow(i, { entry_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio (Gs.)</Label>
                    <Input inputMode="numeric" value={showAmount(row.amount)} onChange={(e) => updateRow(i, { amount: parseAmount(e.target.value) })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>V.I.</Label>
                    <Select
                      value={row.immediate_coverage_ui || 'heredar'}
                      onValueChange={(v) => updateRow(i, { immediate_coverage_ui: v === 'heredar' ? '' : (v as 'si' | 'no') })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heredar">Según el contrato</SelectItem>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">+595</span>
                      <Input value={row.phone} onChange={(e) => updateRow(i, { phone: e.target.value.replace(/\D/g, '') })} placeholder="981123456" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Domicilio</Label>
                    <Input value={row.address} onChange={(e) => updateRow(i, { address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Barrio</Label>
                    <Input value={row.barrio} onChange={(e) => updateRow(i, { barrio: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setRows((p) => [...p, emptyRow()])}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar otra persona
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setRows([emptyRow()]); }}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleCrear} disabled={crear.isPending}>
                  {crear.isPending ? 'Creando...' : 'Crear Incorporación'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Cargando incorporaciones...</div>
      ) : Object.keys(porOperacion).length === 0 ? (
        !showForm && (
          <div className="py-8 text-center text-muted-foreground">
            Este contrato todavía no tiene incorporaciones.
          </div>
        )
      ) : (
        <div className="space-y-2">
          {Object.entries(porOperacion).map(([operationSaleId, personas]) => {
            const op = (personas as any[])[0]?.operation_sale;
            const total = (personas as any[]).reduce((s, p) => s + (Number(p.adherent_amount) || 0), 0);
            return (
              <Card key={operationSaleId}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{op?.contract_number || 'Anexo'}</span>
                      <Badge variant="outline">{op?.status || 'borrador'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {(personas as any[])
                        .map((p) => `${p.adherent_first_name} ${p.adherent_last_name}`.trim())
                        .join(', ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(personas as any[]).length} persona(s) · {formatCurrency(total)}
                    </p>
                  </div>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => navigate(`/sales/${operationSaleId}/edit`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir anexo
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SaleIncorporationsTab;
