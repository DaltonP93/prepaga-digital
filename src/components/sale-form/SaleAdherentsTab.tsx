
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useBeneficiaries, useCreateBeneficiary, useDeleteBeneficiary, useUpdateBeneficiary } from '@/hooks/useBeneficiaries';
import { BeneficiaryDocuments } from '@/components/beneficiaries/BeneficiaryDocuments';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface SaleAdherentsTabProps {
  saleId?: string;
  disabled?: boolean;
}

const SaleAdherentsTab: React.FC<SaleAdherentsTabProps> = ({ saleId, disabled }) => {
  const { data: beneficiaries, isLoading } = useBeneficiaries(saleId || '');
  const createBeneficiary = useCreateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();

  const [showForm, setShowForm] = useState(false);
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());
  const [newBeneficiary, setNewBeneficiary] = useState({
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
  });

  if (!saleId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guarde la venta primero</h3>
        <p className="text-muted-foreground">
          Debe guardar la venta en la pestaña "Básico" antes de agregar adherentes.
        </p>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newBeneficiary.first_name || !newBeneficiary.last_name) {
      toast.error('Nombre y apellido son obligatorios');
      return;
    }
    try {
      await createBeneficiary.mutateAsync({
        ...newBeneficiary,
        sale_id: saleId,
      });
      setNewBeneficiary({ first_name: '', last_name: '', dni: '', relationship: '', birth_date: '', phone: '', email: '', address: '', barrio: '', city: '', amount: 0 });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding beneficiary:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBeneficiary.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
    }
  };

  const toggleDocs = (id: string) => {
    setExpandedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Adherentes ({beneficiaries?.filter(b => !b.is_primary).length || 0})</h3>
        </div>
        {!disabled && (
          <Button type="button" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo Adherente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={newBeneficiary.first_name}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input
                  value={newBeneficiary.last_name}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Apellido"
                />
              </div>
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input
                  value={newBeneficiary.dni}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, dni: e.target.value }))}
                  placeholder="Nº Documento"
                />
              </div>
              <div className="space-y-2">
                <Label>Parentesco</Label>
                <Select
                  value={newBeneficiary.relationship}
                  onValueChange={(v) => setNewBeneficiary(prev => ({ ...prev, relationship: v }))}
                >
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
                <Label>Fecha de Nacimiento</Label>
                <Input
                  type="date"
                  value={newBeneficiary.birth_date}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Monto (Gs.)</Label>
                <Input
                  type="number"
                  step="1"
                  value={newBeneficiary.amount}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Domicilio</Label>
                <Input
                  value={newBeneficiary.address}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Ej: Boquerón 123"
                />
              </div>
              <div className="space-y-2">
                <Label>Barrio</Label>
                <Input
                  value={newBeneficiary.barrio}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, barrio: e.target.value }))}
                  placeholder="Ej: Villa Morra"
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={newBeneficiary.city}
                  onChange={(e) => setNewBeneficiary(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Ciudad"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="button" onClick={handleAdd} disabled={createBeneficiary.isPending}>
                Guardar Adherente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando adherentes...</div>
      ) : beneficiaries && beneficiaries.filter(b => !b.is_primary).length > 0 ? (
        <div className="space-y-2">
          {beneficiaries.filter(b => !b.is_primary).map((b) => (
            <div key={b.id} className="space-y-2">
              <Card>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <div className="font-medium">{b.first_name} {b.last_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {b.dni && `DNI: ${b.dni}`} {b.relationship && `• ${b.relationship}`}
                      {b.amount ? ` • ${formatCurrency(Number(b.amount) || 0)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDocs(b.id)}
                    >
                      {expandedDocIds.has(b.id) ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      Documentos
                    </Button>
                    {!disabled && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              {expandedDocIds.has(b.id) && (
                <BeneficiaryDocuments
                  beneficiaryId={b.id}
                  beneficiaryName={`${b.first_name} ${b.last_name}`}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No hay adherentes registrados. Haga clic en "Agregar" para empezar.
        </div>
      )}
    </div>
  );
};

export default SaleAdherentsTab;
