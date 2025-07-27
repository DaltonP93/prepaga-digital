
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BeneficiaryFormData {
  first_name: string;
  last_name: string;
  dni: string;
  relationship: string;
  phone: string;
  email: string;
  birth_date: string;
  amount: number;
}

interface BeneficiariesManagerProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BeneficiariesManager({ saleId, open, onOpenChange }: BeneficiariesManagerProps) {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
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
      return data;
    },
    enabled: !!saleId && open,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BeneficiaryFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      dni: '',
      relationship: '',
      phone: '',
      email: '',
      birth_date: '',
      amount: 0,
    }
  });

  const createBeneficiary = useMutation({
    mutationFn: async (data: BeneficiaryFormData) => {
      const { error } = await supabase
        .from('beneficiaries')
        .insert([{
          sale_id: saleId,
          ...data,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Beneficiario agregado",
        description: "El beneficiario ha sido agregado exitosamente.",
      });
      setShowForm(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el beneficiario.",
        variant: "destructive",
      });
    },
  });

  const updateBeneficiary = useMutation({
    mutationFn: async (data: BeneficiaryFormData) => {
      const { error } = await supabase
        .from('beneficiaries')
        .update(data)
        .eq('id', selectedBeneficiary.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Beneficiario actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
      setShowForm(false);
      setSelectedBeneficiary(null);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el beneficiario.",
        variant: "destructive",
      });
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
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Beneficiario eliminado",
        description: "El beneficiario ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el beneficiario.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: BeneficiaryFormData) => {
    if (selectedBeneficiary) {
      await updateBeneficiary.mutateAsync(data);
    } else {
      await createBeneficiary.mutateAsync(data);
    }
  };

  const handleEdit = (beneficiary: any) => {
    setSelectedBeneficiary(beneficiary);
    setValue('first_name', beneficiary.first_name);
    setValue('last_name', beneficiary.last_name);
    setValue('dni', beneficiary.dni);
    setValue('relationship', beneficiary.relationship);
    setValue('phone', beneficiary.phone);
    setValue('email', beneficiary.email);
    setValue('birth_date', beneficiary.birth_date);
    setValue('amount', beneficiary.amount || 0);
    setShowForm(true);
  };

  const handleAdd = () => {
    setSelectedBeneficiary(null);
    reset();
    setShowForm(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Beneficiarios</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Beneficiarios</h3>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Beneficiario
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Cargando beneficiarios...</div>
            ) : beneficiaries && beneficiaries.length > 0 ? (
              <div className="grid gap-4">
                {beneficiaries.map((beneficiary) => (
                  <Card key={beneficiary.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-medium">
                            {beneficiary.first_name} {beneficiary.last_name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>DNI: {beneficiary.dni}</span>
                            <Badge variant="outline">{beneficiary.relationship}</Badge>
                            {(beneficiary.amount || 0) > 0 && (
                              <span>Monto: ${Number(beneficiary.amount || 0).toLocaleString()}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Email: {beneficiary.email}</span>
                            <span>Teléfono: {beneficiary.phone}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(beneficiary)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBeneficiary.mutate(beneficiary.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay beneficiarios agregados</p>
                <Button onClick={handleAdd} className="mt-4">
                  Agregar primer beneficiario
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBeneficiary ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  {...register("first_name", { required: "El nombre es requerido" })}
                />
                {errors.first_name && (
                  <span className="text-sm text-red-500">{errors.first_name.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
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
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  {...register("dni")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Relación</Label>
                <Select
                  value={selectedBeneficiary?.relationship || ''}
                  onValueChange={(value) => setValue('relationship', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar relación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hijo">Hijo/a</SelectItem>
                    <SelectItem value="padre">Padre</SelectItem>
                    <SelectItem value="madre">Madre</SelectItem>
                    <SelectItem value="esposo">Esposo/a</SelectItem>
                    <SelectItem value="hermano">Hermano/a</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register("birth_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto Asignado</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register("amount")}
                  placeholder="0.00"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createBeneficiary.isPending || updateBeneficiary.isPending}
              >
                {(createBeneficiary.isPending || updateBeneficiary.isPending) ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
