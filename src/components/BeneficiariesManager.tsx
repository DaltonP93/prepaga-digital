
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/useBeneficiaries';

const beneficiarySchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  dni: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship: z.string().min(1, 'La relación es requerida'),
  birth_date: z.string().optional(),
  amount: z.number().min(0, 'El monto debe ser mayor o igual a 0').optional(),
});

type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;

interface BeneficiariesManagerProps {
  saleId: string;
}

export const BeneficiariesManager: React.FC<BeneficiariesManagerProps> = ({ saleId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<any>(null);

  const { data: beneficiaries = [], isLoading } = useBeneficiaries(saleId);
  const createBeneficiary = useCreateBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(beneficiarySchema),
  });

  const handleEdit = (beneficiary: any) => {
    setEditingBeneficiary(beneficiary);
    setValue('first_name', beneficiary.first_name);
    setValue('last_name', beneficiary.last_name);
    setValue('dni', beneficiary.dni || '');
    setValue('email', beneficiary.email || '');
    setValue('phone', beneficiary.phone || '');
    setValue('relationship', beneficiary.relationship);
    setValue('birth_date', beneficiary.birth_date || '');
    setValue('amount', beneficiary.amount || 0);
    setShowForm(true);
  };

  const onSubmit = (data: BeneficiaryFormData) => {
    // Ensure required fields are present
    if (!data.first_name || !data.last_name || !data.relationship) {
      return;
    }

    const beneficiaryData = {
      sale_id: saleId,
      first_name: data.first_name,
      last_name: data.last_name,
      relationship: data.relationship,
      birth_date: data.birth_date || null,
      amount: data.amount || 0,
      email: data.email || null,
      phone: data.phone || null,
      dni: data.dni || null,
    };

    if (editingBeneficiary) {
      updateBeneficiary.mutate(
        { id: editingBeneficiary.id, ...beneficiaryData },
        {
          onSuccess: () => {
            reset();
            setShowForm(false);
            setEditingBeneficiary(null);
          },
        }
      );
    } else {
      createBeneficiary.mutate(beneficiaryData, {
        onSuccess: () => {
          reset();
          setShowForm(false);
        },
      });
    }
  };

  const handleCancel = () => {
    reset();
    setShowForm(false);
    setEditingBeneficiary(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este beneficiario?')) {
      deleteBeneficiary.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Cargando beneficiarios...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Beneficiarios</CardTitle>
            <CardDescription>
              Gestiona los beneficiarios de esta venta
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Beneficiario
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border p-4 rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-4">
              {editingBeneficiary ? 'Editar' : 'Nuevo'} Beneficiario
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    placeholder="Nombre del beneficiario"
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-sm">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    placeholder="Apellido del beneficiario"
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-sm">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dni">DNI/CI</Label>
                  <Input
                    id="dni"
                    {...register('dni')}
                    placeholder="Documento de identidad"
                  />
                </div>
                <div>
                  <Label htmlFor="relationship">Relación *</Label>
                  <Select onValueChange={(value) => setValue('relationship', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar relación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conyuge">Cónyuge</SelectItem>
                      <SelectItem value="hijo">Hijo/a</SelectItem>
                      <SelectItem value="padre">Padre</SelectItem>
                      <SelectItem value="madre">Madre</SelectItem>
                      <SelectItem value="hermano">Hermano/a</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.relationship && (
                    <p className="text-red-500 text-sm">{errors.relationship.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Email del beneficiario"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="Teléfono del beneficiario"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...register('birth_date')}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Monto de Cobertura</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register('amount', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createBeneficiary.isPending || updateBeneficiary.isPending}
                >
                  {editingBeneficiary ? 'Actualizar' : 'Crear'} Beneficiario
                </Button>
              </div>
            </form>
          </div>
        )}

        {beneficiaries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Relación</TableHead>
                <TableHead>Fecha Nac.</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiaries.map((beneficiary) => (
                <TableRow key={beneficiary.id}>
                  <TableCell>
                    {beneficiary.first_name} {beneficiary.last_name}
                  </TableCell>
                  <TableCell>{beneficiary.dni || '-'}</TableCell>
                  <TableCell>{beneficiary.relationship || '-'}</TableCell>
                  <TableCell>{beneficiary.birth_date || '-'}</TableCell>
                  <TableCell>{beneficiary.is_primary ? 'Sí' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(beneficiary)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(beneficiary.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No hay beneficiarios agregados
          </p>
        )}
      </CardContent>
    </Card>
  );
};
