
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { usePlans } from "@/hooks/usePlans";
import { useTemplates } from "@/hooks/useTemplates";
import { useCreateSale, useUpdateSale } from "@/hooks/useSales";
import { useCompanies } from "@/hooks/useCompanies";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
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
  company_id: string;
  template_ids: string[];
  total_amount: number;
  notes?: string;
}

export function SaleForm({ open, onOpenChange, sale }: SaleFormProps) {
  const { data: clients = [] } = useClients();
  const { data: plans = [] } = usePlans();
  const { data: companies = [] } = useCompanies();
  const { templates = [] } = useTemplates();
  const { profile } = useSimpleAuthContext();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const isEditing = !!sale;

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SaleFormData>();

  const selectedPlan = plans.find(plan => plan.id === watch("plan_id"));

  // Reset form when sale changes or dialog opens
  useEffect(() => {
    if (open) {
      if (sale) {
        // Editing mode - populate with sale data
        console.log('Loading sale data for editing:', sale);
        
        const formData = {
          client_id: sale.client_id || "",
          plan_id: sale.plan_id || "",
          company_id: sale.company_id || profile?.company_id || "",
          template_ids: sale.template_id ? [sale.template_id] : [],
          total_amount: Number(sale.total_amount) || 0,
          notes: sale.notes || "",
        };
        
        reset(formData);
        setSelectedTemplates(sale.template_id ? [sale.template_id] : []);
      } else {
        // Creating mode - clear form
        const formData = {
          client_id: "",
          plan_id: "",
          company_id: profile?.company_id || "",
          template_ids: [],
          total_amount: 0,
          notes: "",
        };
        
        reset(formData);
        setSelectedTemplates([]);
      }
    }
  }, [sale, open, profile?.company_id, reset]);

  useEffect(() => {
    if (selectedPlan) {
      setValue("total_amount", Number(selectedPlan.price) || 0);
    }
  }, [selectedPlan, setValue]);

  const onSubmit = async (data: SaleFormData) => {
    try {
      console.log('Form data received:', data);
      
      const saleData = {
        client_id: data.client_id,
        plan_id: data.plan_id,
        company_id: data.company_id,
        total_amount: Number(data.total_amount),
        template_id: selectedTemplates.length > 0 ? selectedTemplates[0] : null,
        notes: data.notes || null,
      };

      console.log('Processed sale data:', saleData);

      if (isEditing && sale) {
        console.log('Updating sale with ID:', sale.id);
        await updateSale.mutateAsync({ 
          id: sale.id, 
          ...saleData,
          updated_at: new Date().toISOString()
        });
        console.log('Sale updated successfully');
      } else {
        console.log('Creating new sale');
        await createSale.mutateAsync({
          ...saleData,
          salesperson_id: profile?.id,
          status: 'borrador' as any,
          created_at: new Date().toISOString()
        });
        console.log('Sale created successfully');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving sale:", error);
    }
  };

  const handlePlanChange = (planId: string) => {
    setValue("plan_id", planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setValue("total_amount", Number(plan.price) || 0);
    }
  };

  const handleTemplateAdd = (templateId: string) => {
    if (!selectedTemplates.includes(templateId)) {
      const newTemplates = [...selectedTemplates, templateId];
      setSelectedTemplates(newTemplates);
      setValue("template_ids", newTemplates);
    }
  };

  const handleTemplateRemove = (templateId: string) => {
    const newTemplates = selectedTemplates.filter(id => id !== templateId);
    setSelectedTemplates(newTemplates);
    setValue("template_ids", newTemplates);
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
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
                <Label>Plan *</Label>
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
                <Label>Empresa *</Label>
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
                {errors.company_id && (
                  <span className="text-sm text-red-500">La empresa es requerida</span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Monto Total (Gs.) *</Label>
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

            
            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Templates para Cuestionarios</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Selecciona los templates que el cliente debe completar antes de la firma
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Agregar Template</Label>
                    <Select onValueChange={handleTemplateAdd}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates
                          .filter(template => !selectedTemplates.includes(template.id))
                          .map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Templates Seleccionados</Label>
                      <div className="space-y-2">
                        {selectedTemplates.map((templateId, index) => {
                          const template = templates.find(t => t.id === templateId);
                          return (
                            <div key={templateId} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{index + 1}</Badge>
                                <span className="font-medium">{template?.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTemplateRemove(templateId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
              {createSale.isPending || updateSale.isPending ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')} Venta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
