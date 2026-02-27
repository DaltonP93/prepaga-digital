import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileSignature, Plus, Trash2, Lock, Send, Loader2, Eye, FileText, User, ChevronDown, ChevronUp, Paperclip, ExternalLink, RefreshCw } from 'lucide-react';
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

const isAnexoPlanName = (value?: string | null) => {
  const lower = (value || '').toLowerCase();
  return lower.includes('anexo plan') || (lower.includes('anexo') && lower.includes('plan'));
};

const normalizeResponsePlaceholder = (value?: string | null): string => {
  if (!value) return '';
  let normalized = value.trim();
  if (normalized.startsWith('{{') && normalized.endsWith('}}')) {
    normalized = normalized.slice(2, -2).trim();
  }
  if (normalized.startsWith('respuestas.')) {
    normalized = normalized.replace(/^respuestas\./, '');
  }
  return normalized;
};

const SaleTemplatesTab: React.FC<SaleTemplatesTabProps> = ({ saleId, auditStatus, disabled }) => {
  const navigate = useNavigate();
  const { templates } = useTemplates();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showDocuments, setShowDocuments] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const createSignatureLink = useCreateSignatureLink();
  const { data: beneficiaries } = useBeneficiaries(saleId || '');
  const [annexSignedUrls, setAnnexSignedUrls] = useState<Record<string, string>>({});
  const [expandedAnnexes, setExpandedAnnexes] = useState<Record<string, boolean>>({});

  const isApproved = auditStatus === 'aprobado' || auditStatus === 'aprobado_para_templates';

  // Fetch associated templates
  const { data: saleTemplates, isLoading } = useQuery({
    queryKey: ['sale-templates', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('sale_templates')
        .select('*, templates:template_id(id, name, description, content)')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  // Fetch annexes for all associated template IDs
  const templateIds = saleTemplates?.map((st: any) => st.templates?.id || st.template_id).filter(Boolean) || [];
  const { data: templateAnnexes } = useQuery({
    queryKey: ['sale-template-annexes', templateIds],
    queryFn: async () => {
      if (templateIds.length === 0) return [];
      const { data, error } = await supabase
        .from('template_attachments' as any)
        .select('*')
        .in('template_id', templateIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: templateIds.length > 0,
  });

  // Load signed URL for an annex
  const loadAnnexSignedUrl = async (annex: any) => {
    if (annexSignedUrls[annex.id]) return annexSignedUrls[annex.id];
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(annex.file_url, 3600);
    if (data?.signedUrl) {
      setAnnexSignedUrls(prev => ({ ...prev, [annex.id]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  // Auto-load signed URLs for PDF annexes
  useEffect(() => {
    if (!templateAnnexes?.length) return;
    templateAnnexes.forEach((annex: any) => {
      const isPDF = annex.file_type === 'application/pdf' || annex.file_name?.endsWith('.pdf');
      if (isPDF && !annexSignedUrls[annex.id]) {
        loadAnnexSignedUrl(annex);
      }
    });
  }, [templateAnnexes]);

  // Fetch generated documents for this sale
  const { data: generatedDocs } = useQuery({
    queryKey: ['sale-generated-documents', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, document_type, status, beneficiary_id, content, file_url, requires_signature, generated_from_template, created_at')
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

      // Always fetch fresh beneficiaries at send-time to avoid stale placeholder rendering
      const { data: beneficiariesFromDb, error: beneficiariesError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (beneficiariesError) throw beneficiariesError;
      const effectiveBeneficiaries = beneficiariesFromDb || beneficiaries || [];

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
        const normalizedPlaceholder = normalizeResponsePlaceholder(placeholderName);
        if (tr.response_value !== null && tr.response_value !== undefined) {
          if (normalizedPlaceholder) {
            responsesMap[normalizedPlaceholder] = tr.response_value;
          }
          if (tr.question_id) {
            responsesMap[tr.question_id] = tr.response_value;
          }
        }
      });

      // Fallback: If DDJJ responses are not populated from template_responses,
      // build them directly from beneficiary health data (primary beneficiary / titular)
      const primaryBen = (effectiveBeneficiaries || []).find((b: any) => b.is_primary);
      if (primaryBen && !responsesMap['ddjj_peso']) {
        const healthDetail = primaryBen.preexisting_conditions_detail || '';
        const detailLines = healthDetail.split('; ');
        
        // Extract structured data from preexisting_conditions_detail
        for (const line of detailLines) {
          if (line.startsWith('Peso:')) {
            responsesMap['ddjj_peso'] = line.replace('Peso:', '').replace('kg', '').trim();
          } else if (line.startsWith('Estatura:')) {
            responsesMap['ddjj_altura'] = line.replace('Estatura:', '').replace('cm', '').trim();
          } else if (line.startsWith('Hábitos:')) {
            const habits = line.replace('Hábitos:', '').trim();
            responsesMap['ddjj_fuma'] = habits.includes('Fuma') ? 'Sí' : 'No';
            responsesMap['ddjj_vapea'] = habits.includes('Vapea') ? 'Sí' : 'No';
            responsesMap['ddjj_alcohol'] = habits.includes('alcohólicas') ? 'Sí' : 'No';
          } else if (line.startsWith('Última menstruación')) {
            responsesMap['ddjj_menstruacion'] = line.split(':').slice(1).join(':').trim();
          }
        }

        // Parse health questions from detail
        for (let i = 1; i <= 7; i++) {
          if (!responsesMap[`ddjj_pregunta_${i}`]) {
            const questionPrefix = `${i}.`;
            const matchingLine = detailLines.find(l => l.trim().startsWith(questionPrefix));
            if (matchingLine) {
              responsesMap[`ddjj_pregunta_${i}`] = matchingLine.includes(':') 
                ? 'Sí: ' + matchingLine.split(':').slice(1).join(':').trim()
                : 'Sí';
            } else {
              responsesMap[`ddjj_pregunta_${i}`] = primaryBen.has_preexisting_conditions ? '' : 'No';
            }
          }
        }
        
        // Set default No for habits if not found
        if (!responsesMap['ddjj_fuma']) responsesMap['ddjj_fuma'] = 'No';
        if (!responsesMap['ddjj_vapea']) responsesMap['ddjj_vapea'] = 'No';
        if (!responsesMap['ddjj_alcohol']) responsesMap['ddjj_alcohol'] = 'No';
        if (!responsesMap['ddjj_menstruacion']) responsesMap['ddjj_menstruacion'] = 'N/A';
      }

      // *** ENHANCED TEMPLATE ENGINE — 50+ variables, beneficiary loops, formatted dates/currency ***
      const { createEnhancedTemplateContext, interpolateEnhancedTemplate } = await import('@/lib/enhancedTemplateEngine');
      const context = createEnhancedTemplateContext(
        client, plan, company, sale, effectiveBeneficiaries || [], undefined, responsesMap
      );

      // Generate documents for the titular (all templates)
      // Preload attachment info to detect annexo-only templates
      const { data: allAttachments } = await supabase
        .from('template_attachments' as any)
        .select('template_id')
        .in('template_id', templateIds);
      const templatesWithAttachments = new Set((allAttachments || []).map((a: any) => a.template_id));

      for (const template of (templateContents || [])) {
        const hasDesignerContent = !!template.content?.trim();
        const renderedContent = hasDesignerContent
          ? interpolateEnhancedTemplate(template.content || '', context)
          : '';
        const lower = template.name.toLowerCase();
        const isDDJJ = lower.includes('ddjj') || lower.includes('declaración') || lower.includes('declaracion');
        const isContrato = lower.includes('contrato');
        const isAnexoPlan = isAnexoPlanName(template.name);
        const isAnexo = isAnexoPlan || (!isDDJJ && !isContrato);

        // Skip annexo templates without designer content that have file attachments
        // (the attachments will be inserted separately below)
        if (isAnexo && !hasDesignerContent && templatesWithAttachments.has(template.id)) {
          continue;
        }

        const normalizedContent = !hasDesignerContent && isAnexo
          ? `<p>Documento de anexo cargado sin estructura de diseñador. Procesado como template interno.</p>`
          : renderedContent;

        await supabase.from('documents').insert({
          sale_id: saleId,
          name: template.name,
          document_type: isAnexo ? 'anexo' : (isDDJJ ? 'ddjj_salud' : 'contrato'),
          content: normalizedContent,
          status: 'pendiente' as any,
          requires_signature: !isAnexo,
          is_final: isAnexo,
          generated_from_template: true,
          beneficiary_id: null,
        });
      }

      // Generate DDJJ documents per beneficiary (adherente)
      const ddjiTemplates = (templateContents || []).filter(t =>
        t.name.toLowerCase().includes('ddjj') || t.name.toLowerCase().includes('declaración')
      );

      if (effectiveBeneficiaries && effectiveBeneficiaries.length > 0 && ddjiTemplates.length > 0) {
        for (const b of effectiveBeneficiaries) {
          if (b.signature_required !== false && !b.is_primary) {
            // Build per-beneficiary DDJJ responses from their own health data
            const benResponsesMap: Record<string, any> = { ...responsesMap };
            const benDetail = b.preexisting_conditions_detail || '';
            const benLines = benDetail.split('; ');
            for (const line of benLines) {
              if (line.startsWith('Peso:')) {
                benResponsesMap['ddjj_peso'] = line.replace('Peso:', '').replace('kg', '').trim();
              } else if (line.startsWith('Estatura:')) {
                benResponsesMap['ddjj_altura'] = line.replace('Estatura:', '').replace('cm', '').trim();
              } else if (line.startsWith('Hábitos:')) {
                const habits = line.replace('Hábitos:', '').trim();
                benResponsesMap['ddjj_fuma'] = habits.includes('Fuma') ? 'Sí' : 'No';
                benResponsesMap['ddjj_vapea'] = habits.includes('Vapea') ? 'Sí' : 'No';
                benResponsesMap['ddjj_alcohol'] = habits.includes('alcohólicas') ? 'Sí' : 'No';
              }
            }
            // Parse per-beneficiary health questions
            for (let i = 1; i <= 7; i++) {
              const questionPrefix = `${i}.`;
              const matchingLine = benLines.find(l => l.trim().startsWith(questionPrefix));
              if (matchingLine) {
                benResponsesMap[`ddjj_pregunta_${i}`] = matchingLine.includes(':')
                  ? 'Sí: ' + matchingLine.split(':').slice(1).join(':').trim()
                  : 'Sí';
              } else if (!benResponsesMap[`ddjj_pregunta_${i}`]) {
                benResponsesMap[`ddjj_pregunta_${i}`] = b.has_preexisting_conditions ? '' : 'No';
              }
            }
            if (!benResponsesMap['ddjj_fuma']) benResponsesMap['ddjj_fuma'] = 'No';
            if (!benResponsesMap['ddjj_vapea']) benResponsesMap['ddjj_vapea'] = 'No';
            if (!benResponsesMap['ddjj_alcohol']) benResponsesMap['ddjj_alcohol'] = 'No';

            for (const ddjiTemplate of ddjiTemplates) {
              const beneficiaryContext = createEnhancedTemplateContext(
                {
                  first_name: b.first_name, last_name: b.last_name,
                  email: b.email, phone: b.phone, dni: b.document_number || (b as any).dni,
                  address: b.address, birth_date: b.birth_date,
                  city: (b as any).city, province: (b as any).province,
                },
                plan, company, sale, effectiveBeneficiaries || [], undefined, benResponsesMap
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

      // Include template attachments (annexes) as documents
      // Only for templates that did NOT already generate a designer-content document
      const { data: templateAttachments } = await supabase
        .from('template_attachments' as any)
        .select('*')
        .in('template_id', templateIds);

      if (templateAttachments && templateAttachments.length > 0) {
        const templateNameById = new Map(
          (templateContents || []).map((t: any) => [t.id, t.name])
        );
        // Track which templates already had an HTML document generated
        const templatesWithContent = new Set(
          (templateContents || []).filter((t: any) => !!t.content?.trim()).map((t: any) => t.id)
        );

        for (const att of templateAttachments) {
          const parentTemplateId = (att as any).template_id;
          // Skip attachment if the parent template already generated an HTML document
          // (avoids duplicate: one HTML doc + one PDF attachment for same annexo)
          if (templatesWithContent.has(parentTemplateId)) {
            continue;
          }

          const parentTemplateName = templateNameById.get(parentTemplateId);
          const isAnexoPlanAttachment = isAnexoPlanName(parentTemplateName) || isAnexoPlanName((att as any).file_name);

          await supabase.from('documents').insert({
            sale_id: saleId,
            name: `${isAnexoPlanAttachment ? 'Anexo Plan' : 'Anexo'} - ${(att as any).file_name}`,
            document_type: 'anexo',
            file_url: (att as any).file_url,
            content: null,
            status: 'pendiente' as any,
            requires_signature: false,
            is_final: true,
            generated_from_template: true,
            beneficiary_id: null,
          });
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
      if (effectiveBeneficiaries && effectiveBeneficiaries.length > 0) {
        for (const b of effectiveBeneficiaries) {
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

  // Regenerate documents without creating new signature links (used after resend erased docs)
  const handleRegenerateDocuments = async () => {
    if (!saleId || !saleTemplates?.length) return;

    try {
      setRegenerating(true);

      // Delete old non-final generated documents first (not signed ones)
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('sale_id', saleId)
        .eq('generated_from_template', true)
        .neq('status', 'firmado' as any)
        .is('is_final', false);

      if (deleteError) {
        console.warn('Error deleting old docs (non-final):', deleteError);
      }

      // Also delete old annexes that are generated_from_template
      await supabase
        .from('documents')
        .delete()
        .eq('sale_id', saleId)
        .eq('generated_from_template', true)
        .eq('document_type', 'anexo')
        .neq('status', 'firmado' as any);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`*, clients:client_id(*), plans:plan_id(*), companies:company_id(*)`)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;
      const client = sale?.clients as any;
      const plan = sale?.plans as any;
      const company = sale?.companies as any;

      const tplIds = saleTemplates.map((st: any) => st.templates?.id || st.template_id).filter(Boolean);

      const { data: beneficiariesFromDb } = await supabase
        .from('beneficiaries').select('*').eq('sale_id', saleId).order('created_at', { ascending: true });
      const effectiveBeneficiaries = beneficiariesFromDb || beneficiaries || [];

      const { data: templateContents, error: templateError } = await supabase
        .from('templates').select('*').in('id', tplIds);
      if (templateError) throw templateError;

      const { data: templateResponses } = await supabase
        .from('template_responses')
        .select('*, template_questions:question_id(placeholder_name)')
        .eq('sale_id', saleId);

      const responsesMap: Record<string, any> = {};
      (templateResponses || []).forEach((tr: any) => {
        const ph = normalizeResponsePlaceholder(tr.template_questions?.placeholder_name);
        if (tr.response_value !== null && tr.response_value !== undefined) {
          if (ph) responsesMap[ph] = tr.response_value;
          if (tr.question_id) responsesMap[tr.question_id] = tr.response_value;
        }
      });

      // Fallback: Build DDJJ responses from primary beneficiary health data (same as handleSendDocuments)
      const primaryBen = (effectiveBeneficiaries || []).find((b: any) => b.is_primary);
      if (primaryBen && !responsesMap['ddjj_peso']) {
        const healthDetail = primaryBen.preexisting_conditions_detail || '';
        const detailLines = healthDetail.split('; ');
        for (const line of detailLines) {
          if (line.startsWith('Peso:')) {
            responsesMap['ddjj_peso'] = line.replace('Peso:', '').replace('kg', '').trim();
          } else if (line.startsWith('Estatura:')) {
            responsesMap['ddjj_altura'] = line.replace('Estatura:', '').replace('cm', '').trim();
          } else if (line.startsWith('Hábitos:')) {
            const habits = line.replace('Hábitos:', '').trim();
            responsesMap['ddjj_fuma'] = habits.includes('Fuma') ? 'Sí' : 'No';
            responsesMap['ddjj_vapea'] = habits.includes('Vapea') ? 'Sí' : 'No';
            responsesMap['ddjj_alcohol'] = habits.includes('alcohólicas') ? 'Sí' : 'No';
          } else if (line.startsWith('Última menstruación')) {
            responsesMap['ddjj_menstruacion'] = line.split(':').slice(1).join(':').trim();
          }
        }
        for (let i = 1; i <= 7; i++) {
          if (!responsesMap[`ddjj_pregunta_${i}`]) {
            const questionPrefix = `${i}.`;
            const matchingLine = detailLines.find(l => l.trim().startsWith(questionPrefix));
            if (matchingLine) {
              responsesMap[`ddjj_pregunta_${i}`] = matchingLine.includes(':') 
                ? 'Sí: ' + matchingLine.split(':').slice(1).join(':').trim()
                : 'Sí';
            } else {
              responsesMap[`ddjj_pregunta_${i}`] = primaryBen.has_preexisting_conditions ? '' : 'No';
            }
          }
        }
        if (!responsesMap['ddjj_fuma']) responsesMap['ddjj_fuma'] = 'No';
        if (!responsesMap['ddjj_vapea']) responsesMap['ddjj_vapea'] = 'No';
        if (!responsesMap['ddjj_alcohol']) responsesMap['ddjj_alcohol'] = 'No';
        if (!responsesMap['ddjj_menstruacion']) responsesMap['ddjj_menstruacion'] = 'N/A';
      }

      const { createEnhancedTemplateContext, interpolateEnhancedTemplate } = await import('@/lib/enhancedTemplateEngine');
      const context = createEnhancedTemplateContext(client, plan, company, sale, effectiveBeneficiaries, undefined, responsesMap);

      const { data: allAttachments } = await supabase
        .from('template_attachments' as any).select('template_id').in('template_id', tplIds);
      const templatesWithAttachments = new Set((allAttachments || []).map((a: any) => a.template_id));

      for (const template of (templateContents || [])) {
        const hasContent = !!template.content?.trim();
        const rendered = hasContent ? interpolateEnhancedTemplate(template.content || '', context) : '';
        const lower = template.name.toLowerCase();
        const isDDJJ = lower.includes('ddjj') || lower.includes('declaración') || lower.includes('declaracion');
        const isContrato = lower.includes('contrato');
        const isAnexo = isAnexoPlanName(template.name) || (!isDDJJ && !isContrato);

        if (isAnexo && !hasContent && templatesWithAttachments.has(template.id)) continue;

        await supabase.from('documents').insert({
          sale_id: saleId,
          name: template.name,
          document_type: isAnexo ? 'anexo' : (isDDJJ ? 'ddjj_salud' : 'contrato'),
          content: !hasContent && isAnexo ? '<p>Documento de anexo.</p>' : rendered,
          status: 'pendiente' as any,
          requires_signature: !isAnexo,
          is_final: isAnexo,
          generated_from_template: true,
          beneficiary_id: null,
        });
      }

      // DDJJ per adherente
      const ddjiTpls = (templateContents || []).filter(t =>
        t.name.toLowerCase().includes('ddjj') || t.name.toLowerCase().includes('declaración')
      );
      if (effectiveBeneficiaries.length > 0 && ddjiTpls.length > 0) {
        for (const b of effectiveBeneficiaries) {
          if (b.signature_required !== false && !b.is_primary) {
            // Build per-beneficiary DDJJ responses from their own health data (same as handleSendDocuments)
            const benResponsesMap: Record<string, any> = { ...responsesMap };
            const benDetail = b.preexisting_conditions_detail || '';
            const benLines = benDetail.split('; ');
            for (const line of benLines) {
              if (line.startsWith('Peso:')) {
                benResponsesMap['ddjj_peso'] = line.replace('Peso:', '').replace('kg', '').trim();
              } else if (line.startsWith('Estatura:')) {
                benResponsesMap['ddjj_altura'] = line.replace('Estatura:', '').replace('cm', '').trim();
              } else if (line.startsWith('Hábitos:')) {
                const habits = line.replace('Hábitos:', '').trim();
                benResponsesMap['ddjj_fuma'] = habits.includes('Fuma') ? 'Sí' : 'No';
                benResponsesMap['ddjj_vapea'] = habits.includes('Vapea') ? 'Sí' : 'No';
                benResponsesMap['ddjj_alcohol'] = habits.includes('alcohólicas') ? 'Sí' : 'No';
              }
            }
            for (let i = 1; i <= 7; i++) {
              const questionPrefix = `${i}.`;
              const matchingLine = benLines.find(l => l.trim().startsWith(questionPrefix));
              if (matchingLine) {
                benResponsesMap[`ddjj_pregunta_${i}`] = matchingLine.includes(':')
                  ? 'Sí: ' + matchingLine.split(':').slice(1).join(':').trim()
                  : 'Sí';
              } else if (!benResponsesMap[`ddjj_pregunta_${i}`]) {
                benResponsesMap[`ddjj_pregunta_${i}`] = b.has_preexisting_conditions ? '' : 'No';
              }
            }
            if (!benResponsesMap['ddjj_fuma']) benResponsesMap['ddjj_fuma'] = 'No';
            if (!benResponsesMap['ddjj_vapea']) benResponsesMap['ddjj_vapea'] = 'No';
            if (!benResponsesMap['ddjj_alcohol']) benResponsesMap['ddjj_alcohol'] = 'No';

            const benCtx = createEnhancedTemplateContext(
              { first_name: b.first_name, last_name: b.last_name, email: b.email, phone: b.phone, dni: b.document_number || (b as any).dni, address: b.address, birth_date: b.birth_date, city: (b as any).city, province: (b as any).province },
              plan, company, sale, effectiveBeneficiaries, undefined, benResponsesMap
            );
            for (const ddji of ddjiTpls) {
              const renderedDDJJ = interpolateEnhancedTemplate(ddji.content || '', benCtx);
              
              // Validate: log unresolved placeholders
              const unresolvedMatches = renderedDDJJ.match(/\{\{[^}]+\}\}/g);
              if (unresolvedMatches && unresolvedMatches.length > 0) {
                console.warn(`[Regeneration] Unresolved placeholders in DDJJ for ${b.first_name}:`, unresolvedMatches);
                await supabase.from('process_traces').insert({
                  sale_id: saleId,
                  action: 'regeneration_unresolved_placeholders',
                  details: { document: ddji.name, beneficiary: `${b.first_name} ${b.last_name}`, placeholders: unresolvedMatches },
                });
              }

              await supabase.from('documents').insert({
                sale_id: saleId,
                name: `${ddji.name} - ${b.first_name} ${b.last_name}`,
                document_type: 'ddjj_salud',
                content: renderedDDJJ,
                status: 'pendiente' as any,
                requires_signature: true,
                beneficiary_id: b.id,
              });
            }
          }
        }
      }

      // Attachments
      const { data: tplAttachments } = await supabase
        .from('template_attachments' as any).select('*').in('template_id', tplIds);
      if (tplAttachments?.length) {
        const nameById = new Map((templateContents || []).map((t: any) => [t.id, t.name]));
        const withContent = new Set((templateContents || []).filter((t: any) => !!t.content?.trim()).map((t: any) => t.id));
        for (const att of tplAttachments) {
          if (withContent.has((att as any).template_id)) continue;
          const pName = nameById.get((att as any).template_id);
          await supabase.from('documents').insert({
            sale_id: saleId,
            name: `${isAnexoPlanName(pName) ? 'Anexo Plan' : 'Anexo'} - ${(att as any).file_name}`,
            document_type: 'anexo',
            file_url: (att as any).file_url,
            content: null,
            status: 'pendiente' as any,
            requires_signature: false,
            is_final: true,
            generated_from_template: true,
            beneficiary_id: null,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['sale-generated-documents', saleId] });
      queryClient.invalidateQueries({ queryKey: ['signed-documents', saleId] });
      toast.success('Documentos regenerados exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al regenerar documentos');
    } finally {
      setRegenerating(false);
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
    t => t.is_active !== false && !saleTemplates?.some(st => (st as any).templates?.id === t.id)
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
          <div className="flex gap-2">
            <Button onClick={handleSendDocuments} disabled={sending || regenerating} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar Documentos para Firma
            </Button>
            <Button onClick={handleRegenerateDocuments} disabled={sending || regenerating} variant="outline" className="gap-2">
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerar Documentos
            </Button>
          </div>
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
          {saleTemplates.map((st: any) => {
            const tplId = st.templates?.id || st.template_id;
            const hasContent = !!(st.templates?.content?.trim());
            const tplAnnexes = (templateAnnexes || []).filter((a: any) => a.template_id === tplId);
            const isAnnexOnly = !hasContent && tplAnnexes.length > 0;
            const isExpanded = expandedAnnexes[st.id] || false;

            return (
              <Card key={st.id}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {st.templates?.name || 'Template'}
                          {getTemplateTypeBadge(st.templates?.name || '')}
                          {isAnnexOnly && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              <Paperclip className="h-3 w-3 mr-1" />
                              Anexo PDF
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{st.templates?.description || ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {tplAnnexes.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedAnnexes(prev => ({ ...prev, [st.id]: !isExpanded }))}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isExpanded ? 'Ocultar' : 'Ver'} ({tplAnnexes.length})
                        </Button>
                      )}
                      {!disabled && !generatedDocs?.length && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTemplate.mutate(st.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline annexes viewer */}
                  {isExpanded && tplAnnexes.length > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      {tplAnnexes.map((annex: any) => {
                        const isPDF = annex.file_type === 'application/pdf' || annex.file_name?.endsWith('.pdf');
                        const url = annexSignedUrls[annex.id];
                        return (
                          <div key={annex.id} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium">{annex.file_name}</span>
                              </div>
                              <Button variant="outline" size="sm" onClick={async () => {
                                const signedUrl = url || await loadAnnexSignedUrl(annex);
                                if (signedUrl) window.open(signedUrl, '_blank');
                              }}>
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Abrir
                              </Button>
                            </div>
                            {isPDF && url ? (
                              <iframe
                                src={`${url}#toolbar=1&navpanes=0`}
                                className="w-full h-[400px] bg-muted/30"
                                title={annex.file_name}
                              />
                            ) : isPDF && !url ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                {annex.file_type || 'Archivo'}{annex.file_size ? ` • ${(annex.file_size / 1024).toFixed(1)} KB` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
              {beneficiaries && beneficiaries.filter(b => !b.is_primary).length > 0 ? ` y ${beneficiaries.filter(b => !b.is_primary).length} adherente(s)` : ''}.
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
