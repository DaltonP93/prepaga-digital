
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useCreateSale, useUpdateSale } from '@/hooks/useSales';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';
import SaleBasicTab from './SaleBasicTab';
import SaleAdherentsTab from './SaleAdherentsTab';
import SaleDocumentsTab from './SaleDocumentsTab';
import SaleDDJJTab from './SaleDDJJTab';
import SaleTemplatesTab from './SaleTemplatesTab';

interface SaleTabbedFormProps {
  sale?: any;
}

const SaleTabbedForm: React.FC<SaleTabbedFormProps> = ({ sale }) => {
  const navigate = useNavigate();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const { profile } = useSimpleAuthContext();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basico');

  const isEditing = !!sale?.id;

  const [formData, setFormData] = useState({
    client_id: sale?.client_id || '',
    plan_id: sale?.plan_id || '',
    company_id: sale?.company_id || profile?.company_id || '',
    total_amount: sale?.total_amount || 0,
    notes: sale?.notes || '',
    requires_adherents: sale?.requires_adherents || false,
    signer_type: (sale as any)?.signer_type || 'titular',
    signer_name: (sale as any)?.signer_name || '',
    signer_dni: (sale as any)?.signer_dni || '',
    signer_relationship: (sale as any)?.signer_relationship || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.plan_id) {
      toast.error('Cliente y Plan son obligatorios');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await updateSale.mutateAsync({
          id: sale.id,
          client_id: formData.client_id,
          plan_id: formData.plan_id,
          company_id: formData.company_id,
          total_amount: formData.total_amount,
          notes: formData.notes,
          requires_adherents: formData.requires_adherents,
          signer_type: formData.signer_type,
          signer_name: formData.signer_type === 'responsable_pago' ? formData.signer_name : null,
          signer_dni: formData.signer_type === 'responsable_pago' ? formData.signer_dni : null,
          signer_relationship: formData.signer_type === 'responsable_pago' ? formData.signer_relationship : null,
        } as any);
        toast.success('Venta actualizada');
      } else {
        const result = await createSale.mutateAsync({
          client_id: formData.client_id,
          plan_id: formData.plan_id,
          company_id: formData.company_id,
          total_amount: formData.total_amount,
          notes: formData.notes,
          requires_adherents: formData.requires_adherents,
          salesperson_id: profile?.id,
          status: 'borrador',
          signer_type: formData.signer_type,
          signer_name: formData.signer_type === 'responsable_pago' ? formData.signer_name : null,
          signer_dni: formData.signer_type === 'responsable_pago' ? formData.signer_dni : null,
          signer_relationship: formData.signer_type === 'responsable_pago' ? formData.signer_relationship : null,
        } as any);
        toast.success('Venta creada exitosamente');
        navigate(`/sales/${result.id}/edit`);
      }
    } catch (error: any) {
      console.error('Error saving sale:', error);
      toast.error(error.message || 'Error al guardar la venta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{isEditing ? 'Editar Venta' : 'Nueva Venta'}</h1>
          <p className="text-muted-foreground">
            {isEditing
              ? `Contrato: ${sale?.contract_number || sale?.id?.slice(-8)}`
              : 'Complete la información para crear una nueva venta'}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Venta'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 gap-1.5 h-auto sm:h-11 sm:grid-cols-5">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="adherentes" disabled={!isEditing}>Adherentes</TabsTrigger>
              <TabsTrigger value="documentos" disabled={!isEditing}>Documentos</TabsTrigger>
              <TabsTrigger value="ddjj" disabled={!isEditing}>DDJJ Salud</TabsTrigger>
              <TabsTrigger value="templates" disabled={!isEditing}>Templates</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="basico">
                <SaleBasicTab
                  formData={formData}
                  onChange={handleChange}
                  companyId={profile?.company_id || undefined}
                />
              </TabsContent>

              <TabsContent value="adherentes">
                <SaleAdherentsTab saleId={sale?.id} />
              </TabsContent>

              <TabsContent value="documentos">
                <SaleDocumentsTab saleId={sale?.id} />
              </TabsContent>

              <TabsContent value="ddjj">
                <SaleDDJJTab saleId={sale?.id} />
              </TabsContent>

              <TabsContent value="templates">
                <SaleTemplatesTab
                  saleId={sale?.id}
                  auditStatus={sale?.audit_status}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaleTabbedForm;
