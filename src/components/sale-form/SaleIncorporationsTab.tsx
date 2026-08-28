import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, UserPlus, ExternalLink, AlertCircle, Pencil, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  useAdherentIncorporations,
  useCreateAdherentIncorporation,
  useUpdateAdherentIncorporation,
  useCancelAdherentIncorporation,
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

/** Único estado desde el que la base deja tocar una incorporación. */
const EDITABLE = 'draft';

/**
 * Estados de la VENTA-OPERACIÓN en los que el anexo todavía se puede tocar.
 *
 * No alcanza con mirar `incorporacion.status`: nadie escribe nunca 'sent' ni
 * 'signed', así que sigue en 'draft' incluso después de que el titular firmó
 * (ahí la venta-operación ya está en 'firmado'). Gatear por el status de la
 * incorporación dejaba los botones vivos sobre un anexo ya firmado.
 * Los hooks repiten esta guarda: acá es sólo para no ofrecer lo imposible.
 */
const OP_EDITABLE = ['borrador'];
const OP_CANCELABLE = ['borrador', 'enviado', 'pendiente'];

/**
 * Fila de `adherent_incorporations`. La tabla todavía no está en types.ts (hay
 * que regenerarlo después de aplicar las migraciones), así que se tipa suelta.
 */
type Incorporacion = Record<string, any>;

const rowFromIncorporation = (inc: Incorporacion): Row => ({
  first_name: inc.adherent_first_name || '',
  last_name: inc.adherent_last_name || '',
  dni: inc.adherent_document_number || '',
  relationship: inc.adherent_relationship || '',
  birth_date: inc.adherent_birth_date || '',
  phone: inc.adherent_phone || '',
  email: inc.adherent_email || '',
  address: '',
  barrio: '',
  city: '',
  amount: Number(inc.adherent_amount) || 0,
  entry_date: inc.coverage_start_date || '',
  immediate_coverage: null,
  immediate_coverage_ui: '',
});

/**
 * Los mismos campos se cargan al crear y al corregir un borrador, así que viven
 * en un solo lugar: si se agrega un dato al alta y no a la edición, el anexo y
 * el adherente que firma dejan de coincidir.
 */
const AdherenteFields: React.FC<{
  value: Row;
  onChange: (patch: Partial<Row>) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
    <div className="space-y-2">
      <Label>Nombre *</Label>
      <Input value={value.first_name} onChange={(e) => onChange({ first_name: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Apellido *</Label>
      <Input value={value.last_name} onChange={(e) => onChange({ last_name: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>C.I. Nº</Label>
      <Input value={value.dni} onChange={(e) => onChange({ dni: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Fecha Nac.</Label>
      <Input type="date" value={value.birth_date || ''} onChange={(e) => onChange({ birth_date: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Parentesco</Label>
      <Select value={value.relationship} onValueChange={(v) => onChange({ relationship: v })}>
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
      <Input type="date" value={value.entry_date || ''} onChange={(e) => onChange({ entry_date: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Precio (Gs.)</Label>
      <Input inputMode="numeric" value={showAmount(value.amount)} onChange={(e) => onChange({ amount: parseAmount(e.target.value) })} placeholder="0" />
    </div>
    <div className="space-y-2">
      <Label>V.I.</Label>
      <Select
        value={value.immediate_coverage_ui || 'heredar'}
        onValueChange={(v) => onChange({ immediate_coverage_ui: v === 'heredar' ? '' : (v as 'si' | 'no') })}
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
        <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, '') })} placeholder="981123456" />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Domicilio</Label>
      <Input value={value.address} onChange={(e) => onChange({ address: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Barrio</Label>
      <Input value={value.barrio} onChange={(e) => onChange({ barrio: e.target.value })} />
    </div>
  </div>
);

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
  const actualizar = useUpdateAdherentIncorporation();
  const cancelar = useCancelAdherentIncorporation();

  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  /** Incorporación en edición (una persona a la vez). */
  const [editando, setEditando] = useState<{ id: string; row: Row } | null>(null);

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

  /**
   * `adherent_incorporations` no guarda domicilio, barrio, ciudad ni género:
   * esos datos sólo viven en el beneficiario de la venta-operación. Hay que
   * traerlos antes de abrir el editor porque el hook de update reescribe el
   * beneficiario COMPLETO; si se enviaran vacíos se borrarían en silencio.
   */
  const abrirEdicion = async (inc: Incorporacion) => {
    const row = rowFromIncorporation(inc);
    if (inc.operation_beneficiary_id) {
      const { data: ben, error } = await supabase
        .from('beneficiaries')
        .select('gender, address, barrio, city, immediate_coverage')
        .eq('id', inc.operation_beneficiary_id)
        .maybeSingle();

      // Si no se pudo leer el beneficiario NO se abre el editor. Abrirlo con
      // estos campos vacíos sería peor que no editar: el hook de update
      // reescribe el beneficiario completo, así que guardar borraría domicilio,
      // barrio, ciudad y género en silencio —y esos datos se copian al contrato
      // madre en la activación, o sea que el adherente terminaría sin domicilio
      // en el contrato definitivo—. Ciudad y género ni siquiera tienen input en
      // el formulario: dependen 100% de este precargado.
      if (error || !ben) {
        toast.error(
          'No se pudieron leer los datos del adherente. No se abre la edición para no borrar domicilio, barrio, ciudad ni género.',
        );
        return;
      }

      row.gender = ben.gender || '';
      row.address = ben.address || '';
      row.barrio = ben.barrio || '';
      row.city = ben.city || '';
      row.immediate_coverage_ui =
        ben.immediate_coverage === true ? 'si' : ben.immediate_coverage === false ? 'no' : '';
    }
    setEditando({ id: inc.id, row });
  };

  const handleGuardarEdicion = async () => {
    if (!editando) return;
    const { row } = editando;
    if (!row.first_name.trim() || !row.last_name.trim()) {
      toast.error('El nombre y el apellido son obligatorios.');
      return;
    }
    if (!row.phone?.trim()) {
      toast.error('El teléfono es obligatorio: es por donde le llega el enlace de firma.');
      return;
    }

    const { immediate_coverage_ui, ...resto } = row;
    try {
      await actualizar.mutateAsync({
        id: editando.id,
        adherent: {
          ...resto,
          birth_date: row.birth_date || null,
          entry_date: row.entry_date || null,
          immediate_coverage:
            immediate_coverage_ui === 'si' ? true : immediate_coverage_ui === 'no' ? false : null,
        },
      });
      setEditando(null);
    } catch {
      // El hook ya muestra el error.
    }
  };

  // Cancelar una operación cancela TODAS sus personas: la venta-operación es
  // una sola y el anexo se firma completo o no se firma.
  const handleCancelarOperacion = async (personas: Incorporacion[]) => {
    let canceladas = 0;
    try {
      for (const p of personas) {
        await cancelar.mutateAsync({ id: p.id });
        canceladas += 1;
      }
    } catch {
      // El hook ya muestra el error de la fila que falló, pero el primer
      // mutateAsync YA dejó la venta-operación en 'cancelado': las personas que
      // quedaron sin cancelar cuelgan de una operación cancelada. Se avisa
      // explícito para que no parezca que quedó todo bien.
      if (canceladas > 0 && canceladas < personas.length) {
        toast.error(
          `El anexo quedó cancelado a medias: ${canceladas} de ${personas.length} personas. Volvé a intentar para cancelar las que faltan.`,
        );
      }
    }
  };

  // Una operación puede incorporar varias personas: se agrupan para mostrarlas juntas.
  const porOperacion = incorporaciones.reduce((acc: Record<string, Incorporacion[]>, inc: Incorporacion) => {
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
                <AdherenteFields value={row} onChange={(patch) => updateRow(i, patch)} />
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
            const op = (personas as Incorporacion[])[0]?.operation_sale;
            const total = (personas as Incorporacion[]).reduce((s: number, p: Incorporacion) => s + (Number(p.adherent_amount) || 0), 0);
            // Editar/cancelar según el estado de la VENTA-OPERACIÓN, no el de la
            // incorporación: ese se queda en 'draft' hasta la activación, así que
            // no distingue un anexo sin emitir de uno ya firmado.
            const estadoOp = op?.status as string | undefined;
            const sePuedeEditar =
              (personas as Incorporacion[]).every((p) => p.status === EDITABLE) &&
              (!estadoOp || OP_EDITABLE.includes(estadoOp));
            const sePuedeCancelar =
              (personas as Incorporacion[]).every((p) => p.status === EDITABLE) &&
              (!estadoOp || OP_CANCELABLE.includes(estadoOp));
            return (
              <Card key={operationSaleId}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{op?.contract_number || 'Anexo'}</span>
                        <Badge variant="outline">{op?.status || 'borrador'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(personas as Incorporacion[]).length} persona(s) · {formatCurrency(total)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {sePuedeCancelar && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" disabled={cancelar.isPending}>
                              <Ban className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cancelar la incorporación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                No se borra nada: la incorporación y su anexo quedan registrados
                                como cancelados. Para incorporar a estas personas habrá que crear
                                una nueva.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Volver</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancelarOperacion(personas as Incorporacion[])}>
                                Cancelar incorporación
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => navigate(`/sales/${operationSaleId}/edit`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir anexo
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y rounded-md border">
                    {(personas as Incorporacion[]).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          {`${p.adherent_first_name || ''} ${p.adherent_last_name || ''}`.trim() || '(sin nombre)'}
                          <span className="text-muted-foreground">
                            {' · '}{formatCurrency(Number(p.adherent_amount) || 0)}
                          </span>
                        </span>
                        {sePuedeEditar && (
                          <Button
                            type="button" variant="ghost" size="sm" className="shrink-0"
                            onClick={() => abrirEdicion(p)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Corrección de un adherente todavía en borrador (típicamente un tipeo
          detectado antes de enviar el anexo a firmar). */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar adherente</DialogTitle>
          </DialogHeader>
          {editando && (
            <AdherenteFields
              value={editando.row}
              onChange={(patch) =>
                setEditando((prev) => (prev ? { ...prev, row: { ...prev.row, ...patch } } : prev))
              }
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardarEdicion} disabled={actualizar.isPending}>
              {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaleIncorporationsTab;
