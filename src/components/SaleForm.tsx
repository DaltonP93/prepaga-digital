
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  // Campos laborales
  workplace?: string;
  profession?: string;
  work_phone?: string;
  work_address?: string;
  // Campos contractuales
  signature_modality?: string;
  maternity_bonus?: boolean;
  immediate_validity?: boolean;
  // CRM
  leads_id?: string;
  // Para menores
  pediatrician?: string;
  birth_place?: string;
  contract_number?: string;
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
      workplace: sale?.workplace || "",
      profession: sale?.profession || "",
      work_phone: sale?.work_phone || "",
      work_address: sale?.work_address || "",
      signature_modality: sale?.signature_modality || "",
      maternity_bonus: sale?.maternity_bonus || false,
      immediate_validity: sale?.immediate_validity || false,
      leads_id: sale?.leads_id || "",
      pediatrician: sale?.pediatrician || "",
      birth_place: sale?.birth_place || "",
      contract_number: sale?.contract_number || "",
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Venta" : "Nueva Venta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Información Básica</TabsTrigger>
              <TabsTrigger value="work">Información Laboral</TabsTrigger>
              <TabsTrigger value="contract">Datos Contractuales</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
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
                    {plan.name} - {Number(plan.price).toLocaleString('es-PY')} Gs.
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
            <Label htmlFor="total_amount">Monto Total (Gs.)</Label>
            <Input
              id="total_amount"
              type="number"
              step="1"
              {...register("total_amount", { 
                required: "El monto es requerido",
                min: { value: 0, message: "El monto debe ser mayor a 0" }
              })}
            />
            {selectedPlan && (
              <p className="text-sm text-gray-500">
                Precio del plan: {Number(selectedPlan.price).toLocaleString('es-PY')} Gs.
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
            </TabsContent>
            
            <TabsContent value="work" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workplace">Lugar de Trabajo</Label>
                <Input
                  id="workplace"
                  {...register("workplace")}
                  placeholder="Empresa o lugar donde trabaja"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession">Profesión</Label>
                <Input
                  id="profession"
                  {...register("profession")}
                  placeholder="Profesión u ocupación"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_phone">Teléfono Laboral</Label>
                <Input
                  id="work_phone"
                  {...register("work_phone")}
                  placeholder="Teléfono del trabajo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_address">Dirección Laboral</Label>
                <Textarea
                  id="work_address"
                  {...register("work_address")}
                  placeholder="Dirección completa del lugar de trabajo"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="contract" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract_number">Número de Contrato</Label>
                <Input
                  id="contract_number"
                  {...register("contract_number")}
                  placeholder="Número de contrato asignado"
                />
              </div>

              <div className="space-y-2">
                <Label>Modalidad de Firma</Label>
                <Select value={watch("signature_modality")} onValueChange={(value) => setValue("signature_modality", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="hibrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maternity_bonus"
                  checked={watch("maternity_bonus")}
                  onCheckedChange={(checked) => setValue("maternity_bonus", checked as boolean)}
                />
                <Label htmlFor="maternity_bonus">Prima de Maternidad</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immediate_validity"
                  checked={watch("immediate_validity")}
                  onCheckedChange={(checked) => setValue("immediate_validity", checked as boolean)}
                />
                <Label htmlFor="immediate_validity">Vigencia Inmediata</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leads_id">ID Leads (CRM)</Label>
                <Input
                  id="leads_id"
                  {...register("leads_id")}
                  placeholder="ID del lead en el sistema CRM"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pediatrician">Pediatra (Para menores)</Label>
                <Input
                  id="pediatrician"
                  {...register("pediatrician")}
                  placeholder="Nombre del pediatra asignado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_place">Lugar de Nacimiento</Label>
                <Input
                  id="birth_place"
                  {...register("birth_place")}
                  placeholder="Ciudad y país de nacimiento"
                />
              </div>
            </TabsContent>
          </Tabs>

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
