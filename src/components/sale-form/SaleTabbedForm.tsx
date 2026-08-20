
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, Lock, Send, MessageSquare, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useCreateSale, useUpdateSale } from '@/hooks/useSales';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useStateTransition } from '@/hooks/useStateTransition';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { AuditCommentsPanel } from '@/components/audit/AuditCommentsPanel';
import { SALE_STATUS_LABELS } from '@/types/workflow';
import type { SaleStatus } from '@/types/workflow';
import { toast } from 'sonner';
import { isSaleLocked, isPrivilegedRole } from '@/lib/saleUtils';
import { resolvePlanFieldsTemplateName } from '@/lib/saleFilters';
import { ChangeStatusModal } from './ChangeStatusModal';
import SaleBasicTab from './SaleBasicTab';
import SaleAdherentsTab from './SaleAdherentsTab';
import SaleDocumentsTab from './SaleDocumentsTab';
import SaleDDJJTab from './SaleDDJJTab';
import SaleTemplatesTab from './SaleTemplatesTab';
import SalePlanFieldsTab from './SalePlanFieldsTab';
import SaleIncorporationsTab from './SaleIncorporationsTab';
import SalePlanChangeTab from './SalePlanChangeTab';

interface SaleTabbedFormProps {
  sale?: any;
}

const SaleTabbedForm: React.FC<SaleTabbedFormProps> = ({ sale }) => {
  const navigate = useNavigate();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const { profile } = useSimpleAuthContext();
  const { canEditState } = useStateTransition();
  const { role } = useRolePermissions();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basico');
  const [tabErrors, setTabErrors] = useState<Record<string, string>>({});
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Fetch audit information requests for this sale (visible to vendor)
  const { data: infoRequests = [] } = useQuery({
    queryKey: ['information-requests', sale?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('information_requests')
        .select('*')
        .eq('sale_id', sale!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sale?.id,
  });

  const isEditing = !!sale?.id;
  const currentStatus = (sale?.status || 'borrador') as SaleStatus;
  const isEditAllowed = !isEditing || canEditState(currentStatus);
  const isAuditorOrAbove = role === 'auditor' || role === 'admin' || role === 'super_admin' || role === 'vendedor';

  // Centralized lock logic
  const isAuditLocked = isSaleLocked(sale, role as any);
  const userIsPrivileged = isPrivilegedRole(role as any);
  const contractStartDate = typeof sale?.contract_start_date === 'string'
    ? sale.contract_start_date.slice(0, 10)
    : '';

  const TEMPLATE_LOCKED_STATUSES: SaleStatus[] = [
    'listo_para_enviar',
    'enviado',
    'firmado_parcial',
    'firmado',
    'completado',
    'expirado',
    'cancelado',
  ];
  const isTemplatesLocked = TEMPLATE_LOCKED_STATUSES.includes(currentStatus) && !userIsPrivileged;
  const statusLabel = SALE_STATUS_LABELS[currentStatus] || currentStatus;

  const [formData, setFormData] = useState({
    client_id: sale?.client_id || '',
    plan_id: sale?.plan_id || '',
    company_id: sale?.company_id || profile?.company_id || '',
    titular_amount: (sale as any)?.titular_amount ?? sale?.total_amount ?? 0,
    notes: sale?.notes || '',
    requires_adherents: sale?.requires_adherents || false,
    signer_type: (sale as any)?.signer_type || 'titular',
    signer_name: (sale as any)?.signer_name || '',
    signer_dni: (sale as any)?.signer_dni || '',
    signer_relationship: (sale as any)?.signer_relationship || '',
    signer_email: (sale as any)?.signer_email || '',
    signer_phone: (sale as any)?.signer_phone || '',
    billing_razon_social: (sale as any)?.billing_razon_social || '',
    billing_ruc: (sale as any)?.billing_ruc || '',
    billing_email: (sale as any)?.billing_email || '',
    billing_phone: (sale as any)?.billing_phone || '',
    contract_start_date: contractStartDate,
    immediate_coverage: (sale as any)?.immediate_coverage || false,
    maternity_bonus: Boolean((sale as { maternity_bonus?: boolean } | null)?.maternity_bonus),
    sale_type: (sale as any)?.sale_type || 'venta_nueva',
    employee_signature_mode: (sale as any)?.employee_signature_mode || 'individual',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear tab errors when user makes changes
    setTabErrors({});
  };

  // ── Campos personalizados del plan ───────────────────────────────────────
  // Dos caminos para habilitar la pestaña "Campos del Plan":
  //
  //   1. ADICIONAL Plan Materno: el vendedor tilda "Incluye Plan Materno" en la
  //      pestaña Datos. El Plan Materno NO es un plan por si mismo —va siempre
  //      ligado a otro— asi que sus campos se habilitan sobre CUALQUIER plan
  //      contratado. Este camino tiene prioridad.
  //   2. Por nombre del plan: si el plan elegido tiene un template homonimo con
  //      preguntas, se usan esas. Se conserva para no romper otros planes que
  //      hoy dependan de esto.
  //
  // Para el resto de los planes, sin adicional marcado, la pantalla queda
  // exactamente igual que antes.
  const { data: planTemplate = null } = useQuery({
    queryKey: ['plan-custom-fields-template', formData.plan_id, formData.maternity_bonus],
    queryFn: async () => {
      // El adicional manda: no depende del plan elegido (ver resolvePlanFieldsTemplateName).
      let nombrePlan: string | null = null;
      if (!formData.maternity_bonus && formData.plan_id) {
        const { data: p } = await supabase
          .from('plans').select('name').eq('id', formData.plan_id).maybeSingle();
        nombrePlan = p?.name ?? null;
      }
      const nombreBuscado = resolvePlanFieldsTemplateName(formData, nombrePlan);
      if (!nombreBuscado) return null;
      const plan = { name: nombreBuscado };

      const norm = (s: string) =>
        (s || '').toLowerCase().normalize('NFD')
          .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').trim();
      const planName = norm(plan.name);
      const isHealthDDJJ = (n: string) =>
        n.includes('ddjj') || (n.includes('declaracion') && n.includes('salud'));

      const { data: tpls } = await supabase
        .from('templates').select('id, name').eq('is_active', true);

      const candidatos = (tpls || []).filter((t: any) => {
        const n = norm(t.name);
        if (isHealthDDJJ(n)) return false;
        return n === planName || n.includes(planName) || planName.includes(n);
      });

      // Solo cuenta si además tiene preguntas configuradas
      for (const c of candidatos) {
        const { count } = await supabase
          .from('template_questions')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', c.id);
        if ((count || 0) > 0) return c as { id: string; name: string };
      }
      return null;
    },
    // Con el adicional marcado corre aunque todavía no se eligió plan: los
    // campos del Plan Materno no dependen del plan contratado.
    enabled: !!formData.plan_id || !!formData.maternity_bonus,
  });

  const hasPlanFields = !!planTemplate;

  // Campos obligatorios del plan que todavía están sin completar
  const { data: camposFaltantes = [] } = useQuery({
    queryKey: ['plan-fields-missing', sale?.id, planTemplate?.id],
    queryFn: async () => {
      if (!sale?.id || !planTemplate?.id) return [] as string[];
      const [{ data: preguntas }, { data: respuestas }] = await Promise.all([
        supabase.from('template_questions')
          .select('id, question_text, is_required').eq('template_id', planTemplate.id),
        supabase.from('template_responses')
          .select('question_id, response_value')
          .eq('sale_id', sale.id).eq('template_id', planTemplate.id),
      ]);
      const porPregunta = new Map(
        (respuestas || []).map((r: any) => [r.question_id, String(r.response_value ?? '').trim()])
      );
      return (preguntas || [])
        .filter((q: any) => q.is_required && !porPregunta.get(q.id))
        .map((q: any) => q.question_text as string);
    },
    enabled: !!sale?.id && !!planTemplate?.id,
  });

  // Bloquea el avance de estado si faltan campos obligatorios del plan.
  const bloqueadoPorCamposDelPlan = hasPlanFields && camposFaltantes.length > 0;
  const avisarCamposFaltantes = () => {
    toast.error(
      `Faltan campos obligatorios de ${planTemplate?.name}: ${camposFaltantes.join(', ')}`
    );
    setActiveTab('datos_plan');
  };

  const validateBasicTab = (): string | null => {
    if (!formData.client_id) return 'Debe seleccionar un cliente';
    if (!formData.plan_id) return 'Debe seleccionar un plan';
    if (!formData.titular_amount || Number(formData.titular_amount) <= 0) {
      return 'El Monto Titular / Plan debe ser mayor a 0';
    }
    return null;
  };

  const handleTabChange = (newTab: string) => {
    // Validate current tab before allowing navigation forward
    const tabOrder = ['basico', 'adherentes', 'documentos', 'ddjj', 'datos_plan', 'templates', 'incorporaciones', 'cambio_plan', 'auditoria'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);

    // Only validate when moving forward from basico
    if (currentIndex === 0 && newIndex > 0 && isEditing === false) {
      const error = validateBasicTab();
      if (error) {
        setTabErrors({ basico: error });
        toast.error(error);
        return;
      }
    }
    setActiveTab(newTab);
  };

  const handleSave = async () => {
    const validationError = validateBasicTab();
    if (validationError) {
      setTabErrors({ basico: validationError });
      setActiveTab('basico');
      toast.error(validationError);
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
          titular_amount: formData.titular_amount,
          notes: formData.notes,
          requires_adherents: formData.requires_adherents,
          signer_type: formData.signer_type,
          signer_name: formData.signer_type === 'responsable_pago' ? formData.signer_name : null,
          signer_dni: formData.signer_type === 'responsable_pago' ? formData.signer_dni : null,
          signer_relationship: formData.signer_type === 'responsable_pago' ? formData.signer_relationship : null,
          signer_email: formData.signer_type === 'responsable_pago' ? (formData.signer_email || null) : null,
          signer_phone: formData.signer_type === 'responsable_pago' ? (formData.signer_phone || null) : null,
          billing_razon_social: formData.billing_razon_social || null,
          billing_ruc: formData.billing_ruc || null,
          billing_email: formData.billing_email || null,
          billing_phone: formData.billing_phone || null,
          contract_start_date: formData.contract_start_date || null,
          immediate_coverage: formData.immediate_coverage,
          maternity_bonus: formData.maternity_bonus,
          sale_type: formData.sale_type,
          employee_signature_mode: formData.employee_signature_mode,
        } as any);
        // `titular_amount` acaba de cambiar, así que hay que recalcular el total.
        // Se delega en la base, que es la única fuente de verdad (ver migración
        // 20260818000001_fix_total_amount_single_source.sql). Acá había una
        // cuarta fórmula propia — `titular_amount + Σ(no primarios)` — que sólo
        // coincidía con la de la base cuando el monto del primario era igual a
        // `titular_amount`; en cualquier otro caso pisaba el total con un valor
        // distinto del que dejaba el trigger.
        await supabase.rpc('recalculate_sale_total_amount', { p_sale_id: sale.id });
        toast.success('Venta actualizada');
      } else {
        const result = await createSale.mutateAsync({
          client_id: formData.client_id,
          plan_id: formData.plan_id,
          company_id: formData.company_id,
          total_amount: formData.titular_amount,
          titular_amount: formData.titular_amount,
          notes: formData.notes,
          requires_adherents: formData.requires_adherents,
          salesperson_id: profile?.id,
          status: 'borrador',
          signer_type: formData.signer_type,
          signer_name: formData.signer_type === 'responsable_pago' ? formData.signer_name : null,
          signer_dni: formData.signer_type === 'responsable_pago' ? formData.signer_dni : null,
          signer_relationship: formData.signer_type === 'responsable_pago' ? formData.signer_relationship : null,
          signer_email: formData.signer_type === 'responsable_pago' ? (formData.signer_email || null) : null,
          signer_phone: formData.signer_type === 'responsable_pago' ? (formData.signer_phone || null) : null,
          billing_razon_social: formData.billing_razon_social || null,
          billing_ruc: formData.billing_ruc || null,
          billing_email: formData.billing_email || null,
          billing_phone: formData.billing_phone || null,
          contract_start_date: formData.contract_start_date || null,
          immediate_coverage: formData.immediate_coverage,
          maternity_bonus: formData.maternity_bonus,
          sale_type: formData.sale_type,
          employee_signature_mode: formData.employee_signature_mode,
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
        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          <Button variant="outline" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          {isEditAllowed && !isAuditLocked && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Venta'}
            </Button>
          )}
          {isEditing && (currentStatus === 'borrador' || currentStatus === 'rechazado') && (role === 'vendedor' || role === 'gestor' || role === 'admin' || role === 'super_admin') && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              disabled={saving}
              onClick={async () => {
                if (!formData.client_id || !formData.plan_id) {
                  toast.error('Debe tener cliente y plan asignados antes de enviar a auditoría');
                  return;
                }
                // No permitir avanzar de estado si faltan campos obligatorios del plan
                if (bloqueadoPorCamposDelPlan) {
                  avisarCamposFaltantes();
                  return;
                }
                try {
                  setSaving(true);
                  // First save current changes
                  await updateSale.mutateAsync({
                    id: sale.id,
                    client_id: formData.client_id,
                    plan_id: formData.plan_id,
                    company_id: formData.company_id,
                    titular_amount: formData.titular_amount,
                    notes: formData.notes,
                    requires_adherents: formData.requires_adherents,
                    status: 'pendiente' as any,
                    billing_razon_social: formData.billing_razon_social || null,
                    billing_ruc: formData.billing_ruc || null,
                    billing_email: formData.billing_email || null,
                    billing_phone: formData.billing_phone || null,
                    contract_start_date: formData.contract_start_date || null,
                  } as any);
                  // Recalculate total_amount = titular_amount + sum(adherentes) after save
                  const { data: adherentesAudit } = await supabase
                    .from('beneficiaries')
                    .select('amount, is_primary')
                    .eq('sale_id', sale.id);
                  const adherentesSumAudit = (adherentesAudit || [])
                    .filter((b: any) => !b.is_primary)
                    .reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
                  await supabase
                    .from('sales')
                    .update({ total_amount: formData.titular_amount + adherentesSumAudit })
                    .eq('id', sale.id);
                  // Auxiliary workflow tracking is best-effort because production RLS may block direct inserts.
                  const { error: workflowError } = await supabase.from('sale_workflow_states').insert({
                    sale_id: sale.id,
                    previous_status: currentStatus,
                    new_status: 'pendiente',
                    changed_by: profile?.id,
                    change_reason: currentStatus === 'rechazado' ? 'Reenviado a auditoría tras correcciones' : 'Enviado a auditoría por el vendedor',
                  });
                  if (workflowError) {
                    console.error('Best-effort insert failed for sale_workflow_states:', workflowError);
                  }
                  const { error: traceError } = await supabase.from('process_traces').insert({
                    sale_id: sale.id,
                    action: 'status_change',
                    user_id: profile?.id,
                    details: { previous_status: currentStatus, new_status: 'pendiente', reason: currentStatus === 'rechazado' ? 'Reenviado tras correcciones' : 'Enviado a auditoría' },
                  });
                  if (traceError) {
                    console.error('Best-effort insert failed for process_traces:', traceError);
                  }

                  if (profile?.company_id) {
                    const { data: companyProfiles, error: profilesError } = await supabase
                      .from('profiles')
                      .select('id')
                      .eq('company_id', profile.company_id)
                      .eq('is_active', true);

                    if (profilesError) {
                      console.error('Error fetching active company profiles:', profilesError);
                    }

                    const candidateIds = (companyProfiles || []).map((candidate) => candidate.id);
                    const auditRoles: Array<"admin" | "auditor" | "financiero" | "gestor" | "super_admin" | "supervisor" | "vendedor"> = ['auditor', 'supervisor', 'admin', 'super_admin'];

                    let auditRecipients: Array<{ user_id: string }> = [];
                    let recipientsError: any = null;

                    if (candidateIds.length > 0) {
                      const { data: roleRows, error: rolesError } = await supabase
                        .from('user_roles')
                        .select('user_id, role')
                        .in('user_id', candidateIds)
                        .in('role', auditRoles);

                      recipientsError = rolesError;
                      if (!rolesError) {
                        const userRoleIds = (roleRows || []).map((row) => row.user_id);
                        const uniqueUserIds = Array.from(new Set(userRoleIds));
                        auditRecipients = uniqueUserIds.map((userId) => ({ user_id: userId }));
                      }
                    }

                    if (recipientsError) {
                      console.error('Error fetching audit notification recipients:', recipientsError);
                    } else if (auditRecipients?.length) {
                      const recipientRows = auditRecipients
                        .filter((recipient) => recipient.user_id !== profile.id)
                        .map((recipient) => ({
                          user_id: recipient.user_id,
                          title: currentStatus === 'rechazado' ? 'Venta reenviada a auditoría' : 'Nueva venta en auditoría',
                          message: `La venta #${sale.contract_number || sale.id.slice(-4)} está lista para revisión de auditoría.`,
                          type: 'info',
                          link: `/sales/${sale.id}`,
                        }));

                      if (recipientRows.length > 0) {
                        const { error: notificationError } = await supabase
                          .from('notifications')
                          .insert(recipientRows as any);

                        if (notificationError) {
                          console.error('Best-effort insert failed for notifications:', notificationError);
                        }
                      }
                    }
                  }

                  toast.success('Venta enviada a auditoría');
                  navigate('/sales');
                } catch (error: any) {
                  toast.error(error.message || 'Error al enviar a auditoría');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar a Auditoría
            </Button>
          )}
          {isEditing && userIsPrivileged && (
            <Button variant="outline" onClick={() => setShowStatusModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Cambiar Estado
            </Button>
          )}
        </div>
      </div>

      {isAuditLocked && isEditing && (
        <Alert variant="default" className="border-green-400 bg-green-50 dark:bg-green-950/20">
          <Lock className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            {currentStatus === 'aprobado_para_templates'
              ? <>Esta venta fue <strong>aprobada por auditoría</strong>. Los datos quedan bloqueados, pero aún puedes gestionar <strong>Templates</strong> antes del envío.</>
              : <>Esta venta fue <strong>aprobada por auditoría</strong> y está bloqueada para edición. Solo se pueden ver los datos.</>}
          </AlertDescription>
        </Alert>
      )}

      {!isAuditLocked && !isEditAllowed && isEditing && (
        <Alert variant="default" className="border-amber-300 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Esta venta está en estado <strong>{statusLabel}</strong> y no puede ser editada con tu rol actual.
            {role === 'vendedor' && currentStatus !== 'borrador' && currentStatus !== 'rechazado' && (
              <> Solo puedes editar ventas en estado Borrador o Rechazado.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Show audit information requests to vendor - only for pre-approval states */}
      {isEditing && infoRequests.length > 0 && ['borrador', 'pendiente', 'rechazado', 'en_auditoria'].includes(currentStatus) && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <MessageSquare className="h-5 w-5" />
              Solicitudes de Auditoría ({infoRequests.filter((r: any) => r.status === 'pending').length} pendientes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {infoRequests.map((req: any) => (
              <div key={req.id} className="p-3 rounded-lg border border-orange-200 bg-white dark:bg-background space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {req.status === 'pending' ? 'Pendiente' : 'Respondido'}
                  </span>
                </div>
                <p className="text-sm font-medium">{req.description}</p>
                {req.response && (
                  <p className="text-sm text-muted-foreground">Respuesta: {req.response}</p>
                )}
              </div>
            ))}
            {currentStatus === 'rechazado' && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Corrige la información solicitada y vuelve a enviar a auditoría con el botón "Enviar a Auditoría".
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 gap-1.5 h-auto sm:h-11 sm:grid-cols-4 lg:grid-cols-9">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="adherentes" disabled={!isEditing}>Adherentes</TabsTrigger>
              <TabsTrigger value="documentos" disabled={!isEditing}>Documentos</TabsTrigger>
              <TabsTrigger value="ddjj" disabled={!isEditing}>DDJJ Salud</TabsTrigger>
              {hasPlanFields && (
                <TabsTrigger value="datos_plan" disabled={!isEditing}>
                  Campos del Plan
                  {bloqueadoPorCamposDelPlan && (
                    <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-destructive" title="Faltan campos obligatorios" />
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="templates" disabled={!isEditing}>Templates</TabsTrigger>
              {/* Solo tiene sentido incorporar adherentes a un contrato ya firmado. */}
              {isEditing && (currentStatus === 'firmado' || currentStatus === 'completado') && (
                <TabsTrigger value="incorporaciones">Incorporaciones</TabsTrigger>
              )}
              {/* Mismo criterio que incorporaciones: solo se cambia el plan de
                  un contrato ya firmado. */}
              {isEditing && (currentStatus === 'firmado' || currentStatus === 'completado') && (
                <TabsTrigger value="cambio_plan">Cambio de Plan</TabsTrigger>
              )}
              {isEditing && isAuditorOrAbove && (
                <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
              )}
            </TabsList>

            <div className="mt-6">
              <fieldset disabled={isAuditLocked} style={{ all: 'unset', display: 'contents' }}>
              <TabsContent value="basico">
                <fieldset disabled={!isEditAllowed && !isAuditLocked}>
                  <SaleBasicTab
                    formData={formData}
                    onChange={handleChange}
                    companyId={profile?.company_id || undefined}
                    errors={tabErrors}
                  />
                </fieldset>
              </TabsContent>

              <TabsContent value="adherentes">
                <SaleAdherentsTab saleId={sale?.id} disabled={isAuditLocked} />
              </TabsContent>

              <TabsContent value="documentos">
                <fieldset disabled={isAuditLocked}>
                  <SaleDocumentsTab saleId={sale?.id} />
                </fieldset>
              </TabsContent>

              <TabsContent value="ddjj">
                <fieldset disabled={isAuditLocked}>
                  <SaleDDJJTab saleId={sale?.id} />
                </fieldset>
              </TabsContent>

              </fieldset>

              {hasPlanFields && (
                <TabsContent value="datos_plan">
                  <SalePlanFieldsTab
                    saleId={sale?.id}
                    templateId={planTemplate?.id}
                    templateName={planTemplate?.name}
                    disabled={isAuditLocked}
                  />
                </TabsContent>
              )}

              <TabsContent value="templates">
                <SaleTemplatesTab
                  saleId={sale?.id}
                  auditStatus={sale?.audit_status}
                  saleStatus={sale?.status}
                  disabled={isTemplatesLocked}
                />
              </TabsContent>

              {/*
                Va FUERA del <fieldset disabled={isAuditLocked}> a propósito: el
                contrato firmado sigue siendo de solo lectura, pero incorporar un
                adherente es una acción aparte y acotada, que no modifica la venta
                madre sino que crea su propia operación.
              */}
              {isEditing && (currentStatus === 'firmado' || currentStatus === 'completado') && (
                <TabsContent value="incorporaciones">
                  <SaleIncorporationsTab saleId={sale?.id} saleStatus={sale?.status} />
                </TabsContent>
              )}

              {/* Va FUERA del fieldset por el mismo motivo que incorporaciones:
                  el cambio de plan es su propia operación, no edita la venta madre. */}
              {isEditing && (currentStatus === 'firmado' || currentStatus === 'completado') && (
                <TabsContent value="cambio_plan">
                  <SalePlanChangeTab saleId={sale?.id} saleStatus={sale?.status} />
                </TabsContent>
              )}

              {isEditing && isAuditorOrAbove && (
                <TabsContent value="auditoria">
                  <AuditCommentsPanel saleId={sale.id} saleStatus={currentStatus} />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {isEditing && userIsPrivileged && (
        <ChangeStatusModal
          open={showStatusModal}
          onOpenChange={setShowStatusModal}
          saleId={sale.id}
          currentStatus={currentStatus}
          currentAuditStatus={sale?.audit_status || null}
        />
      )}
    </div>
  );
};

export default SaleTabbedForm;
