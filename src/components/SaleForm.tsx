
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/useClients";
import { usePlans } from "@/hooks/usePlans";
import { useTemplates } from "@/hooks/useTemplates";
import { useCreateSale, useUpdateSale } from "@/hooks/useSales";
import { useAuthContext } from "@/components/AuthProvider";
import { Database } from "@/integrations/supabase/types";

type Sale = Database['public']['Tables']['sales']['Row'];

interface SaleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Sale | null;
}

interface SaleFormData {
  client_id: string;
  plan_id: string;
  template_id?: string;
  total_amount: number;
  notes?: string;
}

export function SaleForm({ open, onOpenChange, sale }: SaleFormProps) {
  const { data: clients = [] } = useClients();
  const { data: plans = [] } = usePlans();
  const { templates = [] } = useTemplates();
  const { profile } = useAuthContext();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const isEditing = !!sale;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SaleFormData>({
    defaultValues: {
      client_id: sale?.client_id || "",
      plan_id: sale?.plan_id || "",
      template_id: sale?.template_id || "no-template",
      total_amount: sale?.total_amount || 0,
      notes: sale?.notes || "",
    }
  });

  const selectedPlan = plans.find(plan => plan.id === watch("plan_id"));

  const onSubmit = async (data: SaleFormData) => {
    try {
      // Convert "no-template" back to undefined/null for database
      const templateId = data.template_id === "no-template" ? null : data.template_id;
      
      if (isEditing && sale) {
        await updateSale.mutateAsync({
          id: sale.id,
          ...data,
          template_id: templateId,
        });
      } else {
        await createSale.mutateAsync({
          ...data,
          template_id: templateId,
          company_id: profile?.company_id,
          salesperson_id: profile?.id,
          status: 'borrador',
        });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving sale:", error);
    }
  };

  // Auto-fill amount when plan is selected
  const handlePlanChange = (planId: string) => {
    setValue("plan_id", planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setValue("total_amount", Number(plan.price));
    }
  };

  // Handle template change with proper value conversion
  const handleTemplateChange = (value: string) => {
    setValue("template_id", value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Venta" : "Nueva Venta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={watch("client_id")} onValueChange={(value) => setValue("client_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name} - {client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <span className="text-sm text-red-500">El cliente es requerido</span>
            )}
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={watch("plan_id")} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan_id && (
              <span className="text-sm text-red-500">El plan es requerido</span>
            )}
          </div>

          <div className="space-y-2">
            <Label>Template (Opcional)</Label>
            <Select value={watch("template_id")} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar template para cuestionario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-template">Sin template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.question_count || 0} preguntas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Si seleccionas un template, se enviará un cuestionario antes de la firma
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_amount">Monto Total</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              {...register("total_amount", { 
                required: "El monto es requerido",
                min: { value: 0, message: "El monto debe ser mayor a 0" }
              })}
            />
            {selectedPlan && (
              <p className="text-sm text-gray-500">
                Precio del plan: ${selectedPlan.price}
              </p>
            )}
            {errors.total_amount && (
              <span className="text-sm text-red-500">{errors.total_amount.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Notas adicionales sobre la venta..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createSale.isPending || updateSale.isPending}
            >
              {(createSale.isPending || updateSale.isPending) ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
