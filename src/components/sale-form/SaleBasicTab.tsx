
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { usePlans } from '@/hooks/usePlans';

interface SaleBasicTabProps {
  formData: {
    client_id: string;
    plan_id: string;
    company_id: string;
    total_amount: number;
    notes: string;
    requires_adherents: boolean;
  };
  onChange: (field: string, value: any) => void;
  companyId?: string;
}

const SaleBasicTab: React.FC<SaleBasicTabProps> = ({ formData, onChange, companyId }) => {
  const navigate = useNavigate();
  const { data: clients } = useClients();
  const { data: plans } = usePlans();
  const [searchClient, setSearchClient] = useState('');
  const [searchPlan, setSearchPlan] = useState('');

  const selectedPlan = plans?.find(p => p.id === formData.plan_id);

  useEffect(() => {
    if (selectedPlan) {
      onChange('total_amount', Number(selectedPlan.price) || 0);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (companyId && !formData.company_id) {
      onChange('company_id', companyId);
    }
  }, [companyId]);

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
                    {client.first_name} {client.last_name} {client.dni ? `- DNI: ${client.dni}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
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
                {plan.name} - Gs. {Number(plan.price)?.toLocaleString('es-PY')}
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

      {/* Total Amount */}
      <div className="space-y-2">
        <Label>Monto Total *</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.total_amount}
          onChange={(e) => onChange('total_amount', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
        />
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
    </div>
  );
};

export default SaleBasicTab;
