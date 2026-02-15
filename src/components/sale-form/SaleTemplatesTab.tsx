
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileSignature, Plus, Trash2, Lock, Send, Loader2, Eye, FileText, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTemplates } from '@/hooks/useTemplates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useCreateSignatureLink } from '@/hooks/useSignatureLinks';
import { validateSaleTransition } from '@/lib/workflowValidator';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';

interface SaleTemplatesTabProps {
  saleId?: string;
  auditStatus?: string;
  disabled?: boolean;
}

/** Determine document type badge from name */
const getTemplateTypeBadge = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ddjj') || lower.includes('declaración') || lower.includes('declaracion')) {
    return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">DDJJ</Badge>;
  }
  if (lower.includes('contrato')) {
    return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-[10px]">Contrato</Badge>;
  }
  return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 text-[10px]">Anexo</Badge>;
};

const getDocStatusBadge = (status: string) => {
  switch (status) {
    case 'firmado':
      return <Badge className="bg-green-600 text-[10px]">Firmado</Badge>;
    case 'pendiente':
      return <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
};

const SaleTemplatesTab: React.FC<SaleTemplatesTabProps> = ({ saleId, auditStatus, disabled }) => {
  const navigate = useNavigate();
  const { templates } = useTemplates();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [showDocuments, setShowDocuments] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const createSignatureLink = useCreateSignatureLink();
  const { data: beneficiaries } = useBeneficiaries(saleId || '');

  const isApproved = auditStatus === 'aprobado' || auditStatus === 'aprobado_para_templates';

  // Fetch associated templates
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

  // Fetch generated documents for this sale
  const { data: generatedDocs } = useQuery({
    queryKey: ['sale-generated-documents', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, document_type, status, beneficiary_id, content, created_at')
        .eq('sale_id', saleId)
        .neq('document_type', 'firma')
        .order('created_at', { ascending: true });
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

      // Get full sale details with related data
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(*),
          plans:plan_id(*),
          companies:company_id(*)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;
      const client = sale?.clients as any;
      const plan = sale?.plans as any;
      const company = sale?.companies as any;

      // Fetch template contents for all associated templates
      const templateIds = saleTemplates.map((st: any) => st.templates?.id || st.template_id).filter(Boolean);
      const { data: templateContents, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .in('id', templateIds);

      if (templateError) throw templateError;

      // Fetch questionnaire responses for the sale (with question placeholder_names)
      const { data: templateResponses } = await supabase
        .from('template_responses')
        .select('*, template_questions:question_id(placeholder_name)')
        .eq('sale_id', saleId);

      // Build responses map keyed by placeholder_name
      const responsesMap: Record<string, any> = {};
      (templateResponses || []).forEach((tr: any) => {
        const placeholderName = tr.template_questions?.placeholder_name;
        if (placeholderName && tr.response_value) {
          responsesMap[placeholderName] = tr.response_value;
        }
      });

      // *** ENHANCED TEMPLATE ENGINE — 50+ variables, beneficiary loops, formatted dates/currency ***
      const { createEnhancedTemplateContext, interpolateEnhancedTemplate } = await import('@/lib/enhancedTemplateEngine');
      const context = createEnhancedTemplateContext(
        client, plan, company, sale, beneficiaries || [], undefined, responsesMap
      );

      // Generate documents for the titular (all templates)
      for (const template of (templateContents || [])) {
        const renderedContent = interpolateEnhancedTemplate(template.content || '', context);

        await supabase.from('documents').insert({
          sale_id: saleId,
          name: template.name,
          document_type: template.name.toLowerCase().includes('ddjj') || template.name.toLowerCase().includes('declaración') ? 'ddjj_salud' : 'contrato',
          content: renderedContent,
          status: 'pendiente' as any,
          requires_signature: true,
          beneficiary_id: null,
        });
      }

      // Generate DDJJ documents per beneficiary (adherente)
      const ddjiTemplates = (templateContents || []).filter(t =>
        t.name.toLowerCase().includes('ddjj') || t.name.toLowerCase().includes('declaración')
      );

      if (beneficiaries && beneficiaries.length > 0 && ddjiTemplates.length > 0) {
        for (const b of beneficiaries) {
          if (b.signature_required !== false && !b.is_primary) {
            for (const ddjiTemplate of ddjiTemplates) {
              const beneficiaryContext = createEnhancedTemplateContext(
                {
                  first_name: b.first_name, last_name: b.last_name,
                  email: b.email, phone: b.phone, dni: b.document_number || (b as any).dni,
                  address: b.address, birth_date: b.birth_date,
                  city: (b as any).city, province: (b as any).province,
                },
                plan, company, sale, beneficiaries || [], undefined, responsesMap
              );
              const renderedContent = interpolateEnhancedTemplate(ddjiTemplate.content || '', beneficiaryContext);

              await supabase.from('documents').insert({
                sale_id: saleId,
                name: `${ddjiTemplate.name} - ${b.first_name} ${b.last_name}`,
                document_type: 'ddjj_salud',
                content: renderedContent,
                status: 'pendiente' as any,
                requires_signature: true,
                beneficiary_id: b.id,
              });
            }
          }
        }
      }

      // Create signature link for titular
      await createSignatureLink.mutateAsync({
        saleId,
        recipientType: 'titular',
        recipientEmail: client?.email || '',
        recipientPhone: client?.phone || undefined,
      });

      // Create separate signature links for each adherente
      if (beneficiaries && beneficiaries.length > 0) {
        for (const b of beneficiaries) {
          if (b.signature_required !== false && !b.is_primary) {
            await createSignatureLink.mutateAsync({
              saleId,
              recipientType: 'adherente',
              recipientEmail: b.email || '',
              recipientPhone: b.phone || undefined,
              beneficiaryId: b.id,
            });
          }
        }
      }

      // Validate workflow transition
      const { data: saleForValidation } = await supabase.from('sales').select('*, template_responses(id)').eq('id', saleId).single();
      if (saleForValidation?.company_id) {
        const { data: currentUser } = await supabase.auth.getUser();
        const { data: userRoleData } = await supabase.rpc('get_user_role', { _user_id: currentUser?.user?.id || '' });
        const check = await validateSaleTransition(saleForValidation.company_id, saleForValidation, 'enviado', (userRoleData as any) || 'vendedor');
        if (!check.allowed) throw new Error(check.reasons.join(', '));
      }

      // Update sale status to 'enviado'
      await supabase
        .from('sales')
        .update({ status: 'enviado' } as any)
        .eq('id', saleId);

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-generated-documents', saleId] });
      toast.success('Documentos generados y enviados para firma. Redirigiendo...');

      navigate(`/signature-workflow/${saleId}`);
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

  // Group generated docs
  const titularDocs = generatedDocs?.filter(d => !d.beneficiary_id) || [];
  const adherentDocs = generatedDocs?.filter(d => !!d.beneficiary_id) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Templates de Firma ({saleTemplates?.length || 0})</h3>
        </div>
        {isApproved && saleTemplates && saleTemplates.length > 0 && !generatedDocs?.length && (
          <Button onClick={handleSendDocuments} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Documentos para Firma
          </Button>
        )}
      </div>

      {/* Template selector (only before generation) */}
      {!disabled && !generatedDocs?.length && (
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

      {/* Associated templates list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando templates...</div>
      ) : saleTemplates && saleTemplates.length > 0 ? (
        <div className="space-y-2">
          {saleTemplates.map((st: any) => (
            <Card key={st.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {st.templates?.name || 'Template'}
                      {getTemplateTypeBadge(st.templates?.name || '')}
                    </div>
                    <div className="text-sm text-muted-foreground">{st.templates?.description || ''}</div>
                  </div>
                </div>
                {!disabled && !generatedDocs?.length && (
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

      {/* Pre-generation info */}
      {isApproved && saleTemplates && saleTemplates.length > 0 && !generatedDocs?.length && (
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

      {/* ========== GENERATED DOCUMENTS VIEWER ========== */}
      {generatedDocs && generatedDocs.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setShowDocuments(!showDocuments)}
            className="flex items-center gap-2 w-full text-left"
          >
            <FileText className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Documentos Generados ({generatedDocs.length})
            </h3>
            {showDocuments ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>

          {showDocuments && (
            <div className="space-y-4">
              {/* Titular documents */}
              {titularDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Documentos del Titular</p>
                  {titularDocs.map((doc) => (
                    <Card key={doc.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {doc.name}
                              {getTemplateTypeBadge(doc.document_type || doc.name)}
                              {getDocStatusBadge(doc.status)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleString('es-PY')}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Adherent documents */}
              {adherentDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Documentos de Adherentes
                  </p>
                  {adherentDocs.map((doc) => (
                    <Card key={doc.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {doc.name}
                              {getTemplateTypeBadge(doc.document_type || doc.name)}
                              {getDocStatusBadge(doc.status)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleString('es-PY')}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
};

export default SaleTemplatesTab;
