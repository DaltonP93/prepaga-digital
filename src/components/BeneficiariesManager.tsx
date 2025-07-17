import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Beneficiary {
  id: string;
  sale_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  relationship: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface BeneficiaryFormData {
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

export function BeneficiariesManager({ saleId, open, onOpenChange }: BeneficiariesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BeneficiaryFormData>();

  // Fetch beneficiaries
  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['beneficiaries', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Beneficiary[];
    },
    enabled: !!saleId,
  });

  // Create beneficiary mutation
  const createBeneficiary = useMutation({
    mutationFn: async (data: BeneficiaryFormData) => {
      const { error } = await supabase
        .from('beneficiaries')
        .insert({
          ...data,
          sale_id: saleId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      toast({
        title: "Beneficiario agregado",
        description: "El beneficiario ha sido agregado exitosamente.",
      });
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo agregar el beneficiario.",
        variant: "destructive",
      });
      console.error('Error creating beneficiary:', error);
    },
  });

  // Update beneficiary mutation
  const updateBeneficiary = useMutation({
    mutationFn: async (data: BeneficiaryFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('beneficiaries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      toast({
        title: "Beneficiario actualizado",
        description: "El beneficiario ha sido actualizado exitosamente.",
      });
      reset();
      setShowForm(false);
      setEditingBeneficiary(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el beneficiario.",
        variant: "destructive",
      });
      console.error('Error updating beneficiary:', error);
    },
  });

  // Delete beneficiary mutation
  const deleteBeneficiary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      toast({
        title: "Beneficiario eliminado",
        description: "El beneficiario ha sido eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el beneficiario.",
        variant: "destructive",
      });
      console.error('Error deleting beneficiary:', error);
    },
  });

  const onSubmit = async (data: BeneficiaryFormData) => {
    if (editingBeneficiary) {
      await updateBeneficiary.mutateAsync({ ...data, id: editingBeneficiary.id });
    } else {
      await createBeneficiary.mutateAsync(data);
    }
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setValue('first_name', beneficiary.first_name);
    setValue('last_name', beneficiary.last_name);
    setValue('dni', beneficiary.dni || '');
    setValue('birth_date', beneficiary.birth_date || '');
    setValue('relationship', beneficiary.relationship);
    setValue('phone', beneficiary.phone || '');
    setValue('email', beneficiary.email || '');
    setShowForm(true);
  };

  const handleNewBeneficiary = () => {
    reset();
    setEditingBeneficiary(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este beneficiario?')) {
      await deleteBeneficiary.mutateAsync(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBeneficiary(null);
    reset();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Beneficiarios</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Beneficiarios</h3>
              <p className="text-sm text-muted-foreground">
                Administra los beneficiarios asociados a esta venta
              </p>
            </div>
            <Button onClick={handleNewBeneficiary}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Beneficiario
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Beneficiarios</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Cargando beneficiarios...</div>
              ) : beneficiaries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Nacimiento</TableHead>
                      <TableHead>Parentesco</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.map((beneficiary) => (
                      <TableRow key={beneficiary.id}>
                        <TableCell className="font-medium">
                          {beneficiary.first_name} {beneficiary.last_name}
                        </TableCell>
                        <TableCell>{beneficiary.dni || '-'}</TableCell>
                        <TableCell>
                          {beneficiary.birth_date ? new Date(beneficiary.birth_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{beneficiary.relationship}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {beneficiary.phone && <div>{beneficiary.phone}</div>}
                            {beneficiary.email && <div className="text-muted-foreground">{beneficiary.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(beneficiary)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
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
                <div className="text-center py-8 text-muted-foreground">
                  No hay beneficiarios registrados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showForm} onOpenChange={handleCloseForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBeneficiary ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    {...register("first_name", { required: "El nombre es requerido" })}
                  />
                  {errors.first_name && (
                    <span className="text-sm text-red-500">{errors.first_name.message}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    {...register("last_name", { required: "El apellido es requerido" })}
                  />
                  {errors.last_name && (
                    <span className="text-sm text-red-500">{errors.last_name.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI/CI</Label>
                  <Input
                    id="dni"
                    {...register("dni")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...register("birth_date")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Parentesco *</Label>
                <Input
                  id="relationship"
                  {...register("relationship", { required: "El parentesco es requerido" })}
                  placeholder="Ej: Hijo, Cónyuge, Padre, etc."
                />
                {errors.relationship && (
                  <span className="text-sm text-red-500">{errors.relationship.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBeneficiary.isPending || updateBeneficiary.isPending}
                >
                  {(createBeneficiary.isPending || updateBeneficiary.isPending) 
                    ? "Guardando..." 
                    : editingBeneficiary ? "Actualizar" : "Crear"
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}