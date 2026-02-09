
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileSignature, Plus, Trash2, Lock, Send, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTemplates } from '@/hooks/useTemplates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useCreateSignatureLink } from '@/hooks/useSignatureLinks';

interface SaleTemplatesTabProps {
  saleId?: string;
  auditStatus?: string;
  disabled?: boolean;
}

const SaleTemplatesTab: React.FC<SaleTemplatesTabProps> = ({ saleId, auditStatus, disabled }) => {
  const { templates } = useTemplates();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const createSignatureLink = useCreateSignatureLink();
  const { data: beneficiaries } = useBeneficiaries(saleId || '');

  const isApproved = auditStatus === 'aprobado';

  const { data: saleTemplates, isLoading } = useQuery({
    queryKey: ['sale-templates', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('sale_templates')
        .select('*, templates:template_id(id, name, description)')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  const addTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!saleId) throw new Error('No sale ID');
      const { error } = await supabase
        .from('sale_templates')
        .insert({ sale_id: saleId, template_id: templateId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-templates', saleId] });
      setSelectedTemplateId('');
      toast.success('Template asociado exitosamente');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sale_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-templates', saleId] });
      toast.success('Template removido');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSendDocuments = async () => {
    if (!saleId || !saleTemplates?.length) return;

    try {
      setSending(true);

      // Get sale details for client info
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*, clients:client_id(first_name, last_name, email, phone)')
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;
      const client = sale?.clients as any;

      // Create signature link for titular
      await createSignatureLink.mutateAsync({
        saleId,
        recipientType: 'titular',
        recipientEmail: client?.email || undefined,
        recipientPhone: client?.phone || undefined,
      });

      // Create signature links for each beneficiary
      if (beneficiaries && beneficiaries.length > 0) {
        for (const b of beneficiaries) {
          if (b.signature_required !== false) {
            await createSignatureLink.mutateAsync({
              saleId,
              recipientType: 'beneficiario',
              recipientEmail: b.email || undefined,
              recipientPhone: b.phone || undefined,
              beneficiaryId: b.id,
            });
          }
        }
      }

      // Update sale status to 'listo_para_enviar' or 'enviado'
      await supabase
        .from('sales')
        .update({ status: 'enviado' } as any)
        .eq('id', saleId);

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Documentos enviados para firma. Se generaron los enlaces de firma para el titular y los adherentes.');
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar documentos');
    } finally {
      setSending(false);
    }
  };

  if (!saleId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guarde la venta primero</h3>
        <p className="text-muted-foreground">Debe guardar la venta antes de asociar templates.</p>
      </div>
    );
  }

  if (!isApproved && !disabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Pendiente de Aprobación</h3>
        <p className="text-muted-foreground">
          La venta debe ser aprobada por auditoría antes de asociar templates para firma.
        </p>
        <Badge variant="outline" className="mt-3">
          Estado auditoría: {auditStatus || 'pendiente'}
        </Badge>
      </div>
    );
  }

  const availableTemplates = templates?.filter(
    t => !saleTemplates?.some(st => (st as any).templates?.id === t.id)
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Templates de Firma ({saleTemplates?.length || 0})</h3>
        </div>
        {isApproved && saleTemplates && saleTemplates.length > 0 && (
          <Button
            onClick={handleSendDocuments}
            disabled={sending}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Documentos para Firma
          </Button>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar template..." />
            </SelectTrigger>
            <SelectContent>
              {availableTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={() => selectedTemplateId && addTemplate.mutate(selectedTemplateId)}
            disabled={!selectedTemplateId || addTemplate.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando templates...</div>
      ) : saleTemplates && saleTemplates.length > 0 ? (
        <div className="space-y-2">
          {saleTemplates.map((st: any) => (
            <Card key={st.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <div className="font-medium">{st.templates?.name || 'Template'}</div>
                  <div className="text-sm text-muted-foreground">{st.templates?.description || ''}</div>
                </div>
                {!disabled && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTemplate.mutate(st.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No hay templates asociados. Seleccione templates (DDJJ Salud, Contrato, Anexos) para generar documentos de firma.
        </div>
      )}

      {isApproved && saleTemplates && saleTemplates.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Documentos a enviar:</strong> Se generarán enlaces de firma individuales para el titular
              {beneficiaries && beneficiaries.length > 0 ? ` y ${beneficiaries.length} adherente(s)` : ''}.
              Cada uno recibirá las declaraciones juradas correspondientes junto con el contrato y anexos seleccionados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SaleTemplatesTab;