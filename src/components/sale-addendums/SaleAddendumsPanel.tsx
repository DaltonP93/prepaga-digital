import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useToast } from '@/hooks/use-toast';
import {
  AddendumBeneficiaryInput,
  useAddAddendumBeneficiary,
  useApproveSaleAddendum,
  useCreateSaleAddendum,
  useDeleteAddendumBeneficiary,
  useRejectSaleAddendum,
  useSaleAddendums,
  useSubmitSaleAddendumForAudit,
} from '@/hooks/useSaleAddendums';
import { SaleWithRelations } from '@/types/sale';
import { getSignatureLinkPath, getSignatureLinkUrl } from '@/lib/appUrls';
import { AlertCircle, CheckCircle2, ClipboardCheck, Copy, ExternalLink, Loader2, Plus, Send, Trash2, Users } from 'lucide-react';

interface SaleAddendumsPanelProps {
  sale: SaleWithRelations;
}

const emptyBeneficiary: AddendumBeneficiaryInput = {
  first_name: '',
  last_name: '',
  dni: '',
  relationship: '',
  birth_date: '',
  phone: '',
  email: '',
  address: '',
  barrio: '',
  city: '',
  amount: 0,
  signature_required: true,
  has_preexisting_conditions: false,
  preexisting_conditions_detail: '',
};

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  en_auditoria: 'En auditoría',
  rechazado: 'Rechazado',
  aprobado: 'Aprobado',
  enviado_firma: 'En firma',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const statusClasses: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  en_auditoria: 'bg-amber-100 text-amber-800',
  rechazado: 'bg-red-100 text-red-700',
  aprobado: 'bg-blue-100 text-blue-700',
  enviado_firma: 'bg-indigo-100 text-indigo-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-slate-100 text-slate-500',
};

const canAudit = (role?: string | null) =>
  role === 'auditor' || role === 'admin' || role === 'super_admin' || role === 'supervisor';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-PY');
};

const parseAmount = (value: string) => {
  const clean = value.replace(/\D/g, '');
  return clean ? Number(clean) : 0;
};

export const SaleAddendumsPanel: React.FC<SaleAddendumsPanelProps> = ({ sale }) => {
  const { role } = useRolePermissions();
  const { toast } = useToast();
  const { data: addendums = [], error, isError, isFetching, isLoading, refetch } = useSaleAddendums(sale.id);
  const createAddendum = useCreateSaleAddendum();
  const addBeneficiary = useAddAddendumBeneficiary();
  const deleteBeneficiary = useDeleteAddendumBeneficiary();
  const submitForAudit = useSubmitSaleAddendumForAudit();
  const approveAddendum = useApproveSaleAddendum();
  const rejectAddendum = useRejectSaleAddendum();

  const [selectedAddendumId, setSelectedAddendumId] = useState<string | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState<AddendumBeneficiaryInput>(emptyBeneficiary);
  const [auditNote, setAuditNote] = useState('');

  const isEnterpriseSale = sale.sale_type === 'empresarial' || sale.sale_type === 'unipersonal';
  const isCompleted = sale.status === 'completado';
  // @ts-expect-error contract_end_date exists in DB but not yet in auto-generated Database types
  const contractEndDate = sale.contract_end_date || null;
  const isExpired = contractEndDate ? new Date(contractEndDate) < new Date(new Date().toDateString()) : false;
  const canCreateAddendum = isEnterpriseSale && isCompleted && !isExpired;

  const selectedAddendum = useMemo(() => {
    if (!selectedAddendumId) return addendums[0];
    return addendums.find((item) => item.id === selectedAddendumId);
  }, [addendums, selectedAddendumId]);

  useEffect(() => {
    setAuditNote('');
  }, [selectedAddendum?.id]);

  const isAuditActionPending = submitForAudit.isPending || approveAddendum.isPending || rejectAddendum.isPending;

  const handleCreateAddendum = useCallback(() => {
    createAddendum.mutate(
      { saleId: sale.id, companyId: sale.company_id },
      { onSuccess: (data) => setSelectedAddendumId(data.id) },
    );
  }, [createAddendum, sale.id, sale.company_id]);

  const handleAddBeneficiary = useCallback(() => {
    if (!selectedAddendum?.id) return;
    if (!beneficiaryForm.first_name.trim() || !beneficiaryForm.last_name.trim()) return;
    addBeneficiary.mutate(
      {
        addendumId: selectedAddendum.id,
        values: {
          ...beneficiaryForm,
          birth_date: beneficiaryForm.birth_date || null,
          amount: Number(beneficiaryForm.amount || 0),
        },
      },
      { onSuccess: () => setBeneficiaryForm(emptyBeneficiary) },
    );
  }, [addBeneficiary, selectedAddendum?.id, beneficiaryForm]);

  const handleBeneficiaryChange = useCallback((field: keyof AddendumBeneficiaryInput, value: string) => {
    setBeneficiaryForm((prev) => {
      if (field === 'phone') return { ...prev, phone: value.replace(/\D/g, '') };
      if (field === 'amount') return { ...prev, amount: parseAmount(value) };
      if (field === 'preexisting_conditions_detail') return { ...prev, has_preexisting_conditions: !!value.trim(), preexisting_conditions_detail: value };
      return { ...prev, [field]: value };
    });
  }, []);

  const copyLink = useCallback(async (token: string) => {
    try {
      await navigator.clipboard.writeText(getSignatureLinkUrl(token));
      toast({ title: 'Enlace copiado', description: 'El enlace de firma quedó copiado al portapapeles.' });
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'Copie el enlace abriéndolo en una nueva pestaña.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  if (!isEnterpriseSale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Anexos de Adherentes
          </CardTitle>
          <CardDescription>Disponible para ventas empresariales o unipersonales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta venta tiene tipo "{sale.sale_type || 'sin tipo'}". Cambie el tipo a empresarial o unipersonal para habilitar anexos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Anexos de Adherentes
            </CardTitle>
            <CardDescription>
              Altas posteriores vinculadas al contrato. Vencimiento del contrato: {formatDate(contractEndDate)}.
            </CardDescription>
          </div>
          <Button onClick={handleCreateAddendum} disabled={!canCreateAddendum || createAddendum.isPending}>
            {createAddendum.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Nuevo anexo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isCompleted && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>La venta debe estar completada antes de agregar adherentes por anexo.</AlertDescription>
          </Alert>
        )}

        {isExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>El contrato está vencido. No se pueden crear altas sobre esta venta.</AlertDescription>
          </Alert>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error?.message || 'No se pudieron cargar los anexos.'}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                {isFetching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Cargando anexos...
          </div>
        ) : isError ? null : addendums.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay anexos creados para esta venta.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {addendums.map((addendum) => (
                <button
                  key={addendum.id}
                  type="button"
                  onClick={() => setSelectedAddendumId(addendum.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedAddendum?.id === addendum.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Anexo #{addendum.id.slice(0, 8)}</span>
                    <Badge className={statusClasses[addendum.status] || ''}>{statusLabels[addendum.status] || addendum.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(addendum.beneficiaries || []).length} adherente(s) - {formatDate(addendum.created_at)}
                  </p>
                </button>
              ))}
            </div>

            {selectedAddendum && (
              <div className="space-y-5">
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">Anexo #{selectedAddendum.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Estado: {statusLabels[selectedAddendum.status] || selectedAddendum.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedAddendum.status === 'borrador' || selectedAddendum.status === 'rechazado') && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={(selectedAddendum.beneficiaries || []).length === 0 || isAuditActionPending}
                          onClick={() => submitForAudit.mutate({ addendumId: selectedAddendum.id, saleId: sale.id })}
                        >
                          {submitForAudit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Enviar a auditoría
                        </Button>
                      )}
                      {selectedAddendum.status === 'en_auditoria' && canAudit(role) && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveAddendum.mutate({ addendumId: selectedAddendum.id, saleId: sale.id, note: auditNote })}
                            disabled={isAuditActionPending}
                          >
                            {approveAddendum.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectAddendum.mutate({ addendumId: selectedAddendum.id, saleId: sale.id, note: auditNote || 'Rechazado por auditoría' })}
                            disabled={isAuditActionPending}
                          >
                            {rejectAddendum.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedAddendum.status === 'en_auditoria' && canAudit(role) && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="addendum-audit-note">Nota de auditoría</Label>
                      <Textarea id="addendum-audit-note" value={auditNote} onChange={(event) => setAuditNote(event.target.value)} rows={2} />
                    </div>
                  )}

                  {selectedAddendum.audit_notes && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{selectedAddendum.audit_notes}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {(selectedAddendum.status === 'borrador' || selectedAddendum.status === 'rechazado') && (
                  <div className="rounded-lg border p-4 space-y-4">
                    <h4 className="font-medium">Nuevo adherente</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="addendum-first-name">Nombre *</Label>
                        <Input id="addendum-first-name" value={beneficiaryForm.first_name || ''} onChange={(e) => handleBeneficiaryChange('first_name', e.target.value)} aria-required="true" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-last-name">Apellido *</Label>
                        <Input id="addendum-last-name" value={beneficiaryForm.last_name || ''} onChange={(e) => handleBeneficiaryChange('last_name', e.target.value)} aria-required="true" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-dni">C.I.</Label>
                        <Input id="addendum-dni" value={beneficiaryForm.dni || ''} onChange={(e) => handleBeneficiaryChange('dni', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-relationship">Parentesco</Label>
                        <Input id="addendum-relationship" value={beneficiaryForm.relationship || ''} onChange={(e) => handleBeneficiaryChange('relationship', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-birth-date">Fecha nacimiento</Label>
                        <Input id="addendum-birth-date" type="date" value={beneficiaryForm.birth_date || ''} onChange={(e) => handleBeneficiaryChange('birth_date', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-phone">Teléfono</Label>
                        <Input id="addendum-phone" value={beneficiaryForm.phone || ''} onChange={(e) => handleBeneficiaryChange('phone', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-email">Email</Label>
                        <Input id="addendum-email" type="email" value={beneficiaryForm.email || ''} onChange={(e) => handleBeneficiaryChange('email', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-amount">Monto</Label>
                        <Input id="addendum-amount" inputMode="numeric" value={beneficiaryForm.amount ? Number(beneficiaryForm.amount).toLocaleString('es-PY') : ''} onChange={(e) => handleBeneficiaryChange('amount', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="addendum-address">Domicilio</Label>
                        <Input id="addendum-address" value={beneficiaryForm.address || ''} onChange={(e) => handleBeneficiaryChange('address', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-barrio">Barrio</Label>
                        <Input id="addendum-barrio" value={beneficiaryForm.barrio || ''} onChange={(e) => handleBeneficiaryChange('barrio', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addendum-city">Ciudad</Label>
                        <Input id="addendum-city" value={beneficiaryForm.city || ''} onChange={(e) => handleBeneficiaryChange('city', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="addendum-preexisting-conditions">Preexistencias / observaciones de salud</Label>
                      <Textarea
                        id="addendum-preexisting-conditions"
                        value={beneficiaryForm.preexisting_conditions_detail || ''}
                        onChange={(e) => handleBeneficiaryChange('preexisting_conditions_detail', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddBeneficiary}
                      disabled={addBeneficiary.isPending || !beneficiaryForm.first_name || !beneficiaryForm.last_name}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar al anexo
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium">Adherentes del anexo</h4>
                  {selectedAddendum.beneficiaries && selectedAddendum.beneficiaries.length > 0 ? (
                    selectedAddendum.beneficiaries.map((beneficiary) => (
                      <div key={beneficiary.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium">{beneficiary.first_name} {beneficiary.last_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {beneficiary.dni && `C.I.: ${beneficiary.dni}`} {beneficiary.phone && `- Tel: ${beneficiary.phone}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Vigencia: desde alta hasta {formatDate(contractEndDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{beneficiary.status}</Badge>
                          {(selectedAddendum.status === 'borrador' || selectedAddendum.status === 'rechazado') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBeneficiary.mutate({ id: beneficiary.id, saleId: sale.id })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Sin adherentes cargados.
                    </div>
                  )}
                </div>

                {selectedAddendum.signature_links && selectedAddendum.signature_links.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Enlaces de firma</h4>
                    {selectedAddendum.signature_links.map((link) => (
                      <div key={link.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium">{link.recipient_name || 'Adherente'}</div>
                          <div className="text-xs text-muted-foreground">
                            Estado: {link.status} - Expira: {formatDate(link.expires_at)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyLink(link.token)} aria-label="Copiar enlace de firma">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(getSignatureLinkPath(link.token), '_blank')} aria-label="Abrir enlace de firma">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {link.status === 'completado' && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Firmado
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
