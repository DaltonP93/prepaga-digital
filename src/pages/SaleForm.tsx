
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiTemplateSelector } from '@/components/MultiTemplateSelector';
import { useClients } from '@/hooks/useClients';
import { usePlans } from '@/hooks/usePlans';
import { HelpCircle, Save, ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function SaleForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clients } = useClients();
  const { data: plans } = usePlans();

  const [formData, setFormData] = useState({
    client_id: '',
    plan_id: '',
    template_ids: [] as string[],
    sale_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    signature_modality: 'digital',
    immediate_validity: false,
    maternity_bonus: false,
    birth_place: '',
    profession: '',
    workplace: '',
    work_address: '',
    work_phone: '',
    pediatrician: '',
    leads_id: '',
    notes: '',
  });

  const [showClientForm, setShowClientForm] = useState(false);

  const createSale = useMutation({
    mutationFn: async (saleData: any) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.user.id)
        .single();

      const { data, error } = await supabase
        .from('sales')
        .insert({
          ...saleData,
          company_id: profile?.company_id,
          salesperson_id: user.user.id,
          status: 'borrador',
        })
        .select()
        .single();

      if (error) throw error;

      // Crear registros en sale_templates para cada template seleccionado
      if (saleData.template_ids && saleData.template_ids.length > 0) {
        const saleTemplates = saleData.template_ids.map((templateId: string, index: number) => ({
          sale_id: data.id,
          template_id: templateId,
          order_index: index,
          status: 'pending',
        }));

        const { error: templatesError } = await supabase
          .from('sale_templates')
          .insert(saleTemplates);

        if (templatesError) throw templatesError;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Venta creada correctamente');
      navigate(`/sales/${data.id}`);
    },
    onError: (error) => {
      console.error('Error creating sale:', error);
      toast.error('Error al crear la venta');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      toast.error('Debe seleccionar un cliente');
      return;
    }
    
    if (!formData.plan_id) {
      toast.error('Debe seleccionar un plan');
      return;
    }

    if (formData.template_ids.length === 0) {
      toast.error('Debe seleccionar al menos un template');
      return;
    }

    const submitData = {
      ...formData,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
    };

    createSale.mutate(submitData);
  };

  const handleClientCreated = () => {
    setShowClientForm(false);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    toast.success('Cliente creado correctamente');
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nueva Venta</h1>
            <p className="text-muted-foreground">
              Registra una nueva venta en el sistema
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="client_id">Cliente *</Label>
                    <select
                      id="client_id"
                      value={formData.client_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      {clients?.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.first_name} {client.last_name} - {client.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowClientForm(true)}
                    className="mt-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                  </Button>
                </div>

                <div>
                  <Label htmlFor="plan_id">Plan *</Label>
                  <select
                    id="plan_id"
                    value={formData.plan_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Seleccionar plan</option>
                    {plans?.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${Number(plan.price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sale_date">Fecha de Venta</Label>
                    <Input
                      id="sale_date"
                      type="date"
                      value={formData.sale_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_amount">Monto Total</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Adicional */}
            <Card>
              <CardHeader>
                <CardTitle>Información Adicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="leads_id">ID Leads (CRM)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Identificador del lead en su sistema CRM externo</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="leads_id"
                    value={formData.leads_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, leads_id: e.target.value }))}
                    placeholder="Ej: LEAD-001234"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="birth_place">Lugar de Nacimiento</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ciudad y país donde nació el cliente</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="birth_place"
                    value={formData.birth_place}
                    onChange={(e) => setFormData(prev => ({ ...prev, birth_place: e.target.value }))}
                    placeholder="Ej: Buenos Aires, Argentina"
                  />
                </div>

                <div>
                  <Label htmlFor="profession">Profesión</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                    placeholder="Ej: Ingeniero"
                  />
                </div>

                <div>
                  <Label htmlFor="workplace">Lugar de Trabajo</Label>
                  <Input
                    id="workplace"
                    value={formData.workplace}
                    onChange={(e) => setFormData(prev => ({ ...prev, workplace: e.target.value }))}
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="work_address">Dirección Laboral</Label>
                    <Input
                      id="work_address"
                      value={formData.work_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="work_phone">Teléfono Laboral</Label>
                    <Input
                      id="work_phone"
                      value={formData.work_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pediatrician">Pediatra</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Pediatra de referencia para planes familiares</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="pediatrician"
                    value={formData.pediatrician}
                    onChange={(e) => setFormData(prev => ({ ...prev, pediatrician: e.target.value }))}
                    placeholder="Dr. Nombre Apellido"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="immediate_validity"
                      checked={formData.immediate_validity}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, immediate_validity: checked }))}
                    />
                    <Label htmlFor="immediate_validity">Vigencia Inmediata</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="maternity_bonus"
                      checked={formData.maternity_bonus}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, maternity_bonus: checked }))}
                    />
                    <Label htmlFor="maternity_bonus">Bonus por Maternidad</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selección de Templates */}
          <MultiTemplateSelector
            selectedTemplates={formData.template_ids}
            onSelectionChange={(templateIds) => setFormData(prev => ({ ...prev, template_ids: templateIds }))}
          />

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones o notas adicionales sobre esta venta..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sales')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createSale.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {createSale.isPending ? 'Creando...' : 'Crear Venta'}
            </Button>
          </div>
        </form>

        {/* Modal para nuevo cliente */}
        {showClientForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Nuevo Cliente</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowClientForm(false)}
                >
                  ×
                </Button>
              </div>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Funcionalidad de creación de cliente en desarrollo
                </p>
                <Button
                  onClick={handleClientCreated}
                  className="mt-4"
                >
                  Simular Creación
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
