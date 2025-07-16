
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCompanies } from "@/hooks/useCompanies";
import { useCreatePlan, useUpdatePlan } from "@/hooks/usePlans";
import { useAuthContext } from "@/components/AuthProvider";
import { Database } from "@/integrations/supabase/types";

type Plan = Database['public']['Tables']['plans']['Row'];

interface PlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
}

interface PlanFormData {
  name: string;
  description?: string;
  price: number;
  coverage_details?: string;
  company_id?: string;
  active: boolean;
}

export function PlanForm({ open, onOpenChange, plan }: PlanFormProps) {
  const { data: companies = [] } = useCompanies();
  const { profile } = useAuthContext();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isEditing = !!plan;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PlanFormData>({
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      coverage_details: "",
      company_id: profile?.company_id || "",
      active: true,
    }
  });

  // Reset form when plan changes (for editing)
  React.useEffect(() => {
    if (plan && open) {
      setValue("name", plan.name || "");
      setValue("description", plan.description || "");
      setValue("price", Number(plan.price) || 0);
      setValue("coverage_details", plan.coverage_details || "");
      setValue("company_id", plan.company_id || profile?.company_id || "");
      setValue("active", plan.active ?? true);
    } else if (!plan && open) {
      // Reset for new plan
      reset({
        name: "",
        description: "",
        price: 0,
        coverage_details: "",
        company_id: profile?.company_id || "",
        active: true,
      });
    }
  }, [plan, open, setValue, reset, profile?.company_id]);

  const onSubmit = async (data: PlanFormData) => {
    try {
      if (isEditing && plan) {
        await updatePlan.mutateAsync({
          id: plan.id,
          ...data,
        });
      } else {
        await createPlan.mutateAsync({
          ...data,
          created_by: profile?.id,
        });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Plan" : "Crear Plan"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Plan</Label>
            <Input
              id="name"
              {...register("name", { required: "El nombre es requerido" })}
            />
            {errors.name && (
              <span className="text-sm text-red-500">{errors.name.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio (Gs.)</Label>
            <Input
              id="price"
              type="number"
              step="1"
              {...register("price", { 
                required: "El precio es requerido",
                min: { value: 0, message: "El precio debe ser mayor a 0" }
              })}
            />
            {errors.price && (
              <span className="text-sm text-red-500">{errors.price.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverage_details">Detalles de Cobertura</Label>
            <Textarea
              id="coverage_details"
              {...register("coverage_details")}
              rows={4}
              placeholder="Detalle las coberturas incluidas en este plan..."
            />
          </div>

          {profile?.role === 'super_admin' && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={watch("company_id")} onValueChange={(value) => setValue("company_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={watch("active")}
              onCheckedChange={(checked) => setValue("active", checked)}
            />
            <Label htmlFor="active">Plan Activo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {(createPlan.isPending || updatePlan.isPending) ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
