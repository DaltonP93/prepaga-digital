
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  relationship: string;
  phone?: string;
  email?: string;
}

interface BeneficiariesManagerProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BeneficiariesManager: React.FC<BeneficiariesManagerProps> = ({
  saleId,
  open,
  onOpenChange,
}) => {
  const [isAddingBeneficiary, setIsAddingBeneficiary] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    birth_date: '',
    relationship: '',
    phone: '',
    email: '',
  });

  const queryClient = useQueryClient();

  const { data: beneficiaries, isLoading } = useQuery({
    queryKey: ['beneficiaries', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Beneficiary[];
    },
    enabled: open && !!saleId,
  });

  const addBeneficiary = useMutation({
    mutationFn: async (beneficiary: Omit<Beneficiary, 'id'>) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert({
          ...beneficiary,
          sale_id: saleId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      toast.success('Beneficiario agregado correctamente');
      setFormData({
        first_name: '',
        last_name: '',
        dni: '',
        birth_date: '',
        relationship: '',
        phone: '',
        email: '',
      });
      setIsAddingBeneficiary(false);
    },
    onError: (error) => {
      console.error('Error adding beneficiary:', error);
      toast.error('Error al agregar beneficiario');
    },
  });

  const deleteBeneficiary = useMutation({
    mutationFn: async (beneficiaryId: string) => {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', beneficiaryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      toast.success('Beneficiario eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting beneficiary:', error);
      toast.error('Error al eliminar beneficiario');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.relationship) {
      toast.error('Faltan campos obligatorios');
      return;
    }
    addBeneficiary.mutate(formData);
  };

  const relationshipOptions = [
    { value: 'hijo', label: 'Hijo/a' },
    { value: 'conyuge', label: 'Cónyuge' },
    { value: 'padre', label: 'Padre' },
    { value: 'madre', label: 'Madre' },
    { value: 'hermano', label: 'Hermano/a' },
    { value: 'otro', label: 'Otro familiar' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gestión de Beneficiarios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botón para agregar beneficiario */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Gestiona los beneficiarios para esta venta
            </p>
            <Button
              onClick={() => setIsAddingBeneficiary(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Beneficiario
            </Button>
          </div>

          {/* Formulario para agregar beneficiario */}
          {isAddingBeneficiary && (
            <Card>
              <CardHeader>
                <CardTitle>Nuevo Beneficiario</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Nombre *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Apellido *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dni">DNI</Label>
                      <Input
                        id="dni"
                        value={formData.dni}
                        onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="relationship">Relación *</Label>
                    <Select
                      value={formData.relationship}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar relación" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingBeneficiary(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addBeneficiary.isPending}>
                      {addBeneficiary.isPending ? 'Agregando...' : 'Agregar Beneficiario'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de beneficiarios */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando beneficiarios...</div>
            ) : beneficiaries && beneficiaries.length > 0 ? (
              beneficiaries.map((beneficiary) => (
                <Card key={beneficiary.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {beneficiary.first_name} {beneficiary.last_name}
                          </h3>
                          <Badge variant="secondary">
                            {relationshipOptions.find(r => r.value === beneficiary.relationship)?.label || beneficiary.relationship}
                          </Badge>
                        </div>
                        {beneficiary.dni && (
                          <p className="text-sm text-muted-foreground">DNI: {beneficiary.dni}</p>
                        )}
                        {beneficiary.birth_date && (
                          <p className="text-sm text-muted-foreground">
                            Nacimiento: {new Date(beneficiary.birth_date).toLocaleDateString()}
                          </p>
                        )}
                        {beneficiary.phone && (
                          <p className="text-sm text-muted-foreground">Tel: {beneficiary.phone}</p>
                        )}
                        {beneficiary.email && (
                          <p className="text-sm text-muted-foreground">Email: {beneficiary.email}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBeneficiary.mutate(beneficiary.id)}
                        disabled={deleteBeneficiary.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay beneficiarios registrados
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
