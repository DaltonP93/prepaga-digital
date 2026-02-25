
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { usePlans } from '@/hooks/usePlans';
import { ClientForm } from '@/components/ClientForm';
import { formatCurrency } from '@/lib/utils';

interface SaleBasicTabProps {
  formData: {
    client_id: string;
    plan_id: string;
    company_id: string;
    total_amount: number;
    notes: string;
    requires_adherents: boolean;
    signer_type: string;
    signer_name: string;
    signer_dni: string;
    signer_relationship: string;
    billing_razon_social: string;
    billing_ruc: string;
    billing_email: string;
    billing_phone: string;
    immediate_coverage: boolean;
    sale_type: string;
  };
  onChange: (field: string, value: any) => void;
  companyId?: string;
}

const SaleBasicTab: React.FC<SaleBasicTabProps> = ({ formData, onChange, companyId }) => {
  const { data: clients } = useClients();
  const { data: plans } = usePlans();
  const [searchClient, setSearchClient] = useState('');
  const [searchPlan, setSearchPlan] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [prevClientCount, setPrevClientCount] = useState<number | null>(null);

  const selectedPlan = plans?.find(p => p.id === formData.plan_id);

  // Auto-set company from logged-in user (always)
  useEffect(() => {
    if (companyId) {
      onChange('company_id', companyId);
    }
  }, [companyId]);

  // Auto-calculate total from plan price (readonly)
  useEffect(() => {
    if (selectedPlan) {
      onChange('total_amount', Number(selectedPlan.price) || 0);
    }
  }, [selectedPlan]);

  // Auto-select newly created client when modal closes
  useEffect(() => {
    if (prevClientCount !== null && clients && clients.length > prevClientCount) {
      const newestClient = clients[0];
      if (newestClient) {
        onChange('client_id', newestClient.id);
      }
      setPrevClientCount(null);
    }
  }, [clients, prevClientCount, onChange]);

  const filteredClients = clients?.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchClient.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchClient.toLowerCase())
  ) || [];

  const filteredPlans = plans?.filter(plan =>
    plan.name.toLowerCase().includes(searchPlan.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <div className="space-y-2">
        <Label>Cliente *</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={formData.client_id} onValueChange={(v) => onChange('client_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name} {client.dni ? `- C.I.: ${client.dni}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPrevClientCount(clients?.length ?? 0);
              setShowClientModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="space-y-2">
        <Label>Plan *</Label>
        <Select value={formData.plan_id} onValueChange={(v) => onChange('plan_id', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar plan" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                placeholder="Buscar plan..."
                value={searchPlan}
                onChange={(e) => setSearchPlan(e.target.value)}
                className="mb-2"
              />
            </div>
            {filteredPlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} - {formatCurrency(Number(plan.price) || 0)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Requires Adherents */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="requires_adherents"
          checked={formData.requires_adherents}
          onChange={(e) => onChange('requires_adherents', e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="requires_adherents">¿Requiere adherentes/grupo familiar?</Label>
      </div>

      {/* Vigencia Inmediata & Tipo de Venta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vigencia Inmediata (V.I.)</Label>
          <Select value={formData.immediate_coverage ? 'si' : 'no'} onValueChange={(v) => onChange('immediate_coverage', v === 'si')}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="si">Sí</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo de Venta</Label>
          <Select value={formData.sale_type || 'venta_nueva'} onValueChange={(v) => onChange('sale_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="venta_nueva">Venta Nueva</SelectItem>
              <SelectItem value="reingreso">Reingreso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Total Amount - READONLY, auto-calculated */}
      <div className="space-y-2">
        <Label>Monto Total (Gs.) *</Label>
        <Input
          type="number"
          step="1"
          value={formData.total_amount}
          readOnly
          disabled
          className="bg-muted cursor-not-allowed"
          placeholder="0"
        />
        {selectedPlan && (
          <p className="text-xs text-muted-foreground">
            Calculado automáticamente del plan: {formatCurrency(Number(selectedPlan.price) || 0)}
          </p>
        )}
      </div>

      {/* Signer Selection */}
      <div className="space-y-4 border border-border/70 rounded-xl p-4 sm:p-5 bg-muted/20">
        <Label className="text-base font-semibold">¿Quién firmará el contrato?</Label>
        <Select value={formData.signer_type || 'titular'} onValueChange={(v) => onChange('signer_type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar firmante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="titular">Titular (cliente)</SelectItem>
            <SelectItem value="responsable_pago">Responsable de Pago</SelectItem>
          </SelectContent>
        </Select>

        {formData.signer_type === 'responsable_pago' && (
          <div className="space-y-3 pl-3 border-l-2 border-primary/30">
            <div className="space-y-1">
              <Label>Nombre completo del responsable de pago *</Label>
              <Input
                value={formData.signer_name || ''}
                onChange={(e) => onChange('signer_name', e.target.value)}
                placeholder="Nombre y Apellido"
              />
            </div>
            <div className="space-y-1">
              <Label>C.I. del responsable de pago *</Label>
              <Input
                value={formData.signer_dni || ''}
                onChange={(e) => onChange('signer_dni', e.target.value)}
                placeholder="Número de Cédula"
              />
            </div>
            <div className="space-y-1">
              <Label>Relación con el titular</Label>
              <Input
                value={formData.signer_relationship || ''}
                onChange={(e) => onChange('signer_relationship', e.target.value)}
                placeholder="Ej: Padre, Madre, Tutor legal"
              />
            </div>
          </div>
        )}
      </div>

      {/* Datos de Facturación */}
      <div className="space-y-4 border border-border/70 rounded-xl p-4 sm:p-5 bg-muted/20">
        <Label className="text-base font-semibold">Datos de Facturación</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Razón Social</Label>
            <Input
              value={formData.billing_razon_social || ''}
              onChange={(e) => onChange('billing_razon_social', e.target.value)}
              placeholder="Razón Social"
            />
          </div>
          <div className="space-y-1">
            <Label>R.U.C.</Label>
            <Input
              value={formData.billing_ruc || ''}
              onChange={(e) => onChange('billing_ruc', e.target.value)}
              placeholder="Número de RUC"
            />
          </div>
          <div className="space-y-1">
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={formData.billing_email || ''}
              onChange={(e) => onChange('billing_email', e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Celular</Label>
            <Input
              value={formData.billing_phone || ''}
              onChange={(e) => onChange('billing_phone', e.target.value)}
              placeholder="Número de celular"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Notas adicionales sobre la venta..."
          rows={3}
        />
      </div>

      <ClientForm
        open={showClientModal}
        onOpenChange={setShowClientModal}
      />
    </div>
  );
};

export default SaleBasicTab;
