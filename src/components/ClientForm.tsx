
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";

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
  city?: string;
  province?: string;
  postal_code?: string;
  notes?: string;
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const { profile } = useSimpleAuthContext();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!client;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientFormData>();

  // Reset form when client data changes or dialog opens
  useEffect(() => {
    if (open) {
      if (client) {
        // Editing mode - populate with client data
        reset({
          first_name: client.first_name || "",
          last_name: client.last_name || "",
          email: client.email || "",
          phone: client.phone || "",
          dni: client.dni || "",
          birth_date: client.birth_date || "",
          address: client.address || "",
          city: client.city || "",
          province: client.province || "",
          postal_code: client.postal_code || "",
          notes: client.notes || "",
        });
      } else {
        // Creating mode - clear form
        reset({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          dni: "",
          birth_date: "",
          address: "",
          city: "",
          province: "",
          postal_code: "",
          notes: "",
        });
      }
    }
  }, [client, open, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEditing && client) {
        await updateClient.mutateAsync({
          id: client.id,
          ...data,
        });
      } else {
        await createClient.mutateAsync({
          ...data,
          company_id: profile?.company_id || '',
        });
      }
      onOpenChange(false);
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
                <span className="text-sm text-destructive">{errors.first_name.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                {...register("last_name", { required: "El apellido es requerido" })}
              />
              {errors.last_name && (
                <span className="text-sm text-destructive">{errors.last_name.message}</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
            />
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
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                {...register("city")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input
                id="province"
                {...register("province")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              {...register("address")}
              rows={2}
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
