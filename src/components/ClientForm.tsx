
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { Database } from "@/integrations/supabase/types";

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

interface ClientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  dni?: string;
  birth_date?: string;
  address?: string;
  neighborhood?: string;
  marital_status?: string;
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!client;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClientFormData>({
    defaultValues: {
      first_name: client?.first_name || "",
      last_name: client?.last_name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      dni: client?.dni || "",
      birth_date: client?.birth_date || "",
      address: client?.address || "",
      neighborhood: (client as any)?.neighborhood || "",
      marital_status: (client as any)?.marital_status || "",
    }
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      // Convert special values back to null
      const maritalStatus = data.marital_status === "__none__" ? null : data.marital_status;
      
      const finalData = {
        ...data,
        marital_status: maritalStatus,
        neighborhood: data.neighborhood || null,
      };

      if (isEditing && client) {
        await updateClient.mutateAsync({
          id: client.id,
          ...finalData,
        });
      } else {
        await createClient.mutateAsync(finalData);
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cliente" : "Crear Cliente"}
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email", { required: "El email es requerido" })}
            />
            {errors.email && (
              <span className="text-sm text-red-500">{errors.email.message}</span>
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
              <Label htmlFor="dni">DNI/CI</Label>
              <Input
                id="dni"
                {...register("dni")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
            <Input
              id="birth_date"
              type="date"
              {...register("birth_date")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Barrio</Label>
              <Input
                id="neighborhood"
                {...register("neighborhood")}
                placeholder="Barrio o vecindario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marital_status">Estado Civil</Label>
              <Select 
                value={watch("marital_status") || ""} 
                onValueChange={(value) => setValue("marital_status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado civil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No especificar</SelectItem>
                  <SelectItem value="soltero">Soltero/a</SelectItem>
                  <SelectItem value="casado">Casado/a</SelectItem>
                  <SelectItem value="divorciado">Divorciado/a</SelectItem>
                  <SelectItem value="viudo">Viudo/a</SelectItem>
                  <SelectItem value="union_libre">Unión libre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              {...register("address")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createClient.isPending || updateClient.isPending}
            >
              {(createClient.isPending || updateClient.isPending) ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
