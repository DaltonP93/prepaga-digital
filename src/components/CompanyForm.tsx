
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { Database } from "@/integrations/supabase/types";

type Company = Database['public']['Tables']['companies']['Row'];

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
}

interface CompanyFormData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export function CompanyForm({ open, onOpenChange, company }: CompanyFormProps) {
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const isEditing = !!company;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyFormData>({
    defaultValues: {
      name: company?.name || "",
      address: company?.address || "",
      phone: company?.phone || "",
      email: company?.email || "",
    }
  });

  const onSubmit = async (data: CompanyFormData) => {
    try {
      if (isEditing && company) {
        await updateCompany.mutateAsync({
          id: company.id,
          ...data,
        });
      } else {
        await createCompany.mutateAsync(data);
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving company:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Empresa" : "Crear Empresa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Empresa</Label>
            <Input
              id="name"
              {...register("name", { required: "El nombre es requerido" })}
            />
            {errors.name && (
              <span className="text-sm text-red-500">{errors.name.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              {...register("phone")}
            />
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
              disabled={createCompany.isPending || updateCompany.isPending}
            >
              {(createCompany.isPending || updateCompany.isPending) ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
