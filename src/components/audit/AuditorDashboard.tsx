
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { formatCurrency } from '@/lib/utils';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Eye, Search, 
  FileText, User, DollarSign, Calendar, Filter, Download,
  HeartPulse
} from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';

const HEALTH_QUESTIONS = [
  '1. ¿Padece alguna enfermedad crónica (diabetes, hipertensión, asma, EPOC, reumatológicas, tiroideas, insuficiencia renal u otras)?',
  '2. ¿Padece o ha padecido alguna enfermedad o trastorno mental o neurológico (ansiedad, depresión, convulsiones u otros)?',
  '3. ¿Padece o ha padecido enfermedad cardiovascular o coronaria, o se ha sometido a procedimientos (marcapasos, bypass, cateterismo, etc.)?',
  '4. ¿Posee o ha poseído quistes, tumores o enfermedades oncológicas que hayan requerido cirugía, quimioterapia o radioterapia?',
  '5. ¿Ha sido internado/a o sometido/a a alguna cirugía?',
  '6. ¿Consume medicamentos, sustancias o se somete a tratamientos, de origen médico, natural o experimental?',
  '7. Otras enfermedades o condiciones no mencionadas',
];

const HABITS_LABELS = ['Fuma', 'Vapea', 'Consume bebidas alcohólicas'];

interface ParsedHealthData {
  peso: string;
  altura: string;
  answers: ('si' | 'no' | '')[];
  details: string[];
  habits: boolean[];
  lastMenstruation: string;
}

const parseHealthDetail = (detail: string | null, hasPreexisting: boolean | null): ParsedHealthData => {
  const data: ParsedHealthData = {
    peso: '', altura: '',
    answers: new Array(HEALTH_QUESTIONS.length).fill(''),
    details: new Array(HEALTH_QUESTIONS.length).fill(''),
    habits: [false, false, false],
    lastMenstruation: '',
  };
  if (!detail && !hasPreexisting) return data;
  if (detail) {
    const parts = detail.split('; ');
    for (const part of parts) {
      const qMatch = HEALTH_QUESTIONS.findIndex(q => part.startsWith(q));
      if (qMatch >= 0) {
        data.answers[qMatch] = 'si';
        const colonIdx = part.indexOf(': ', HEALTH_QUESTIONS[qMatch].length - 5);
        if (colonIdx >= 0) data.details[qMatch] = part.substring(colonIdx + 2);
        continue;
      }
      if (part.startsWith('Hábitos: ')) {
        const habitList = part.replace('Hábitos: ', '').split(', ');
        HABITS_LABELS.forEach((h, i) => { if (habitList.includes(h)) data.habits[i] = true; });
        continue;
      }
      if (part.startsWith('Última menstruación/embarazo: ')) {
        data.lastMenstruation = part.replace('Última menstruación/embarazo: ', '');
        continue;
      }
      if (part.startsWith('Peso: ')) { data.peso = part.replace('Peso: ', '').replace(' kg', ''); continue; }
      if (part.startsWith('Estatura: ')) { data.altura = part.replace('Estatura: ', '').replace(' cm', ''); continue; }
    }
  }
  return data;
};

const BeneficiaryHealthView: React.FC<{ beneficiary: any }> = ({ beneficiary }) => {
  const health = parseHealthDetail(beneficiary.preexisting_conditions_detail, beneficiary.has_preexisting_conditions);
  const hasData = beneficiary.preexisting_conditions_detail || beneficiary.has_preexisting_conditions !== null;

  if (!hasData) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        Sin declaración jurada completada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Biometría */}
      <div className="flex flex-wrap gap-4">
        {health.peso && (
          <div className="text-sm"><span className="font-medium">Peso:</span> {health.peso} kg</div>
        )}
        {health.altura && (
          <div className="text-sm"><span className="font-medium">Estatura:</span> {health.altura} cm</div>
        )}
        {health.lastMenstruation && (
          <div className="text-sm"><span className="font-medium">Últ. menstruación:</span> {health.lastMenstruation}</div>
        )}
      </div>

      {/* Hábitos */}
      {health.habits.some(h => h) && (
        <div className="flex flex-wrap gap-2">
          {HABITS_LABELS.map((label, i) => (
            health.habits[i] && (
              <Badge key={i} variant="outline" className="text-orange-600 border-orange-300">
                {label}
              </Badge>
            )
          ))}
        </div>
      )}

      {/* Preguntas */}
      <div className="space-y-1.5">
        {HEALTH_QUESTIONS.map((q, i) => {
          const shortQ = q.replace(/^\d+\.\s*/, '').substring(0, 80) + (q.length > 83 ? '...' : '');
          const answer = health.answers[i];
          if (!answer) return null;
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              {answer === 'si' ? (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0 mt-0.5">Sí</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] px-1.5 py-0 shrink-0 mt-0.5">No</Badge>
              )}
              <div>
                <span className="text-muted-foreground">{shortQ}</span>
                {health.details[i] && (
                  <span className="ml-1 font-medium text-foreground">— {health.details[i]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AuditorDashboard: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [lightboxName, setLightboxName] = useState('');
  const [lightboxType, setLightboxType] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Fetch sales pending audit
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['audit-sales', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          clients (*),
          plans (*),
          beneficiaries (*),
          documents (*),
          sale_documents (*)
        `)
        .order('created_at', { ascending: false });

      // Filter by sale status for audit
      if (statusFilter === 'pending') {
        query = query.in('status', ['pendiente', 'en_auditoria']);
      } else if (statusFilter === 'borrador') {
        query = query.eq('status', 'borrador');
      } else if (statusFilter === 'aprobado') {
        query = query.eq('audit_status', 'aprobado');
      } else if (statusFilter === 'rechazado') {
        query = query.eq('audit_status', 'rechazado');
      } else if (statusFilter === 'requiere_info') {
        query = query.eq('audit_status', 'requiere_info');
      } else {
        // 'all' - show all sales
        query = query.or('status.eq.pendiente,status.eq.en_auditoria,status.eq.borrador,audit_status.neq.null');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch salesperson profiles separately
      const salespersonIds = [...new Set((data || []).map((s: any) => s.salesperson_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (salespersonIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', salespersonIds);
        profilesMap = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      }

      // Fetch beneficiary documents for all beneficiaries
      const allBeneficiaryIds = (data || []).flatMap((s: any) => (s.beneficiaries || []).map((b: any) => b.id));
      let beneficiaryDocsMap: Record<string, any[]> = {};
      if (allBeneficiaryIds.length > 0) {
        const { data: benDocs } = await supabase
          .from('beneficiary_documents')
          .select('*')
          .in('beneficiary_id', allBeneficiaryIds)
          .order('created_at', { ascending: false });
        (benDocs || []).forEach((doc: any) => {
          if (!beneficiaryDocsMap[doc.beneficiary_id]) beneficiaryDocsMap[doc.beneficiary_id] = [];
          beneficiaryDocsMap[doc.beneficiary_id].push(doc);
        });
      }

      return (data || []).map((s: any) => ({
        ...s,
        profiles: profilesMap[s.salesperson_id] || null,
        beneficiaries: (s.beneficiaries || []).map((b: any) => ({
          ...b,
          beneficiary_documents: beneficiaryDocsMap[b.id] || [],
        })),
      }));
    },
  });

  // Realtime: auto-refresh when any sale's status or audit_status changes
  useEffect(() => {
    const channel = supabase
      .channel('audit-sales-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Approve sale - changes status to 'aprobado_para_templates' (approved, ready for next steps)
  const approveSale = useMutation({
    mutationFn: async (saleId: string) => {
      const saleData = sales.find((s: any) => s.id === saleId);
      const previousStatus = saleData?.status || 'pendiente';

      // Calculate contract_start_date: first day of the approval month
      const now = new Date();
      const contractStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const { error } = await supabase
        .from('sales')
        .update({
          audit_status: 'aprobado',
          auditor_id: profile?.id,
          audited_at: new Date().toISOString(),
          audit_notes: auditNotes || 'Aprobado sin observaciones',
          status: 'aprobado_para_templates' as any,
          contract_start_date: contractStartDate,
        } as any)
        .eq('id', saleId);

      if (error) throw error;

      // Log workflow state change
      await supabase.from('sale_workflow_states').insert({
        sale_id: saleId,
        previous_status: previousStatus,
        new_status: 'aprobado_para_templates',
        changed_by: profile?.id,
        change_reason: `Aprobado por auditor: ${auditNotes || 'Sin observaciones'}`,
        metadata: { audit_notes: auditNotes },
      });

      // Log to process traces
      await supabase.from('process_traces').insert({
        sale_id: saleId,
        action: 'audit_approved',
        user_id: profile?.id,
        details: { audit_notes: auditNotes, new_status: 'aprobado_para_templates' },
      });

      // Notify vendedor
      // saleData already declared above
      if (saleData?.salesperson_id) {
        await supabase.from('notifications').insert({
          user_id: saleData.salesperson_id,
          title: 'Venta aprobada por auditoría',
          message: `La venta #${saleData.contract_number || saleId.slice(-4)} ha sido aprobada. ${auditNotes || ''}`,
          type: 'success',
          link: `/sales/${saleId}/edit`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
      setAuditNotes('');
      toast({
        title: 'Venta aprobada',
        description: 'La venta ha sido aprobada y pasa a estado Aprobado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo aprobar la venta.',
        variant: 'destructive',
      });
    },
  });

  // Reject sale - returns to 'rechazado' so vendedor can fix and resubmit
  const rejectSale = useMutation({
    mutationFn: async (saleId: string) => {
      if (!auditNotes.trim()) {
        throw new Error('Debe proporcionar un motivo de rechazo');
      }
      const saleData = sales.find((s: any) => s.id === saleId);
      const previousStatus = saleData?.status || 'pendiente';

      const { error } = await supabase
        .from('sales')
        .update({
          audit_status: 'rechazado',
          auditor_id: profile?.id,
          audited_at: new Date().toISOString(),
          audit_notes: auditNotes,
          status: 'rechazado' as any,
        })
        .eq('id', saleId);

      if (error) throw error;

      // Log workflow state change
      await supabase.from('sale_workflow_states').insert({
        sale_id: saleId,
        previous_status: previousStatus,
        new_status: 'rechazado',
        changed_by: profile?.id,
        change_reason: `Rechazado: ${auditNotes}`,
      });

      // Log to process traces
      await supabase.from('process_traces').insert({
        sale_id: saleId,
        action: 'audit_rejected',
        user_id: profile?.id,
        details: { audit_notes: auditNotes, new_status: 'rechazado' },
      });

      // Notify vendedor
      // saleData already declared above
      if (saleData?.salesperson_id) {
        await supabase.from('notifications').insert({
          user_id: saleData.salesperson_id,
          title: 'Venta rechazada por auditoría',
          message: `La venta #${saleData.contract_number || saleId.slice(-4)} fue rechazada. Motivo: ${auditNotes}`,
          type: 'error',
          link: `/sales/${saleId}/edit`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
      setAuditNotes('');
      toast({
        title: 'Venta rechazada',
        description: 'La venta ha sido rechazada y devuelta al vendedor.',
        variant: 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo rechazar la venta.',
        variant: 'destructive',
      });
    },
  });

  // Request more info
  const requestMoreInfo = useMutation({
    mutationFn: async (saleId: string) => {
      if (!auditNotes.trim()) {
        throw new Error('Debe especificar qué información adicional necesita');
      }

      const saleData = sales.find((s: any) => s.id === saleId);
      const previousStatus = saleData?.status || 'pendiente';

      const { error } = await supabase
        .from('sales')
        .update({
          audit_status: 'requiere_info',
          auditor_id: profile?.id,
          audit_notes: auditNotes,
          status: 'rechazado' as any,
        })
        .eq('id', saleId);

      if (error) throw error;

      // Create information request
      await supabase.from('information_requests').insert({
        sale_id: saleId,
        request_type: 'audit',
        description: auditNotes,
        requested_by: profile?.id,
      });

      // Log workflow state change
      await supabase.from('sale_workflow_states').insert({
        sale_id: saleId,
        previous_status: previousStatus,
        new_status: 'rechazado',
        changed_by: profile?.id,
        change_reason: `Información requerida: ${auditNotes}`,
        metadata: { audit_notes: auditNotes, reason: 'requiere_info' },
      });

      // Log to process traces
      await supabase.from('process_traces').insert({
        sale_id: saleId,
        action: 'audit_request_info',
        user_id: profile?.id,
        details: { audit_notes: auditNotes, new_status: 'rechazado' },
      });

      // Notify vendedor
      // saleData already declared above
      if (saleData?.salesperson_id) {
        await supabase.from('notifications').insert({
          user_id: saleData.salesperson_id,
          title: 'Solicitud de información - Auditoría',
          message: `Se requiere información adicional para la venta #${saleData.contract_number || saleId.slice(-4)}: ${auditNotes}`,
          type: 'warning',
          link: `/sales/${saleId}/edit`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
      setAuditNotes('');
      toast({
        title: 'Solicitud enviada',
        description: 'Se ha solicitado información adicional al vendedor.',
      });
    },
  });

  const getStatusBadge = (status: string, auditStatus: string | null) => {
    switch (status) {
      case 'borrador':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Borrador</Badge>;
      case 'en_auditoria':
      case 'pendiente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'aprobado_para_templates':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="text-blue-600">Enviado</Badge>;
      case 'firmado':
        return <Badge variant="outline" className="text-indigo-600">Firmado</Badge>;
      case 'completado':
        return <Badge className="bg-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
      case 'cancelado':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        if (auditStatus === 'requiere_info') {
          return <Badge variant="outline" className="text-orange-600"><AlertCircle className="h-3 w-3 mr-1" />Info Requerida</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSales = sales.filter((sale: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      sale.clients?.first_name?.toLowerCase().includes(searchLower) ||
      sale.clients?.last_name?.toLowerCase().includes(searchLower) ||
      sale.contract_number?.toLowerCase().includes(searchLower) ||
      sale.plans?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    pending: sales.filter((s: any) => s.status === 'pendiente' || s.status === 'en_auditoria').length,
    approved: sales.filter((s: any) => s.audit_status === 'aprobado').length,
    rejected: sales.filter((s: any) => s.audit_status === 'rechazado' || s.status === 'rechazado').length,
    infoRequired: sales.filter((s: any) => s.audit_status === 'requiere_info').length,
  };

  const detailView = selectedSale ? (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Detalle de Auditoría</h2>
          <Button variant="outline" onClick={() => setSelectedSale(null)}>
            ← Volver al listado
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sale Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Nombre: </span>
                {selectedSale.clients?.first_name} {selectedSale.clients?.last_name}
              </div>
              <div>
                <span className="font-medium">Email: </span>
                {selectedSale.clients?.email || 'No especificado'}
              </div>
              <div>
                <span className="font-medium">Teléfono: </span>
                {selectedSale.clients?.phone || 'No especificado'}
              </div>
              <div>
                <span className="font-medium">C.I.: </span>
                {selectedSale.clients?.dni || 'No especificado'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información del Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Plan: </span>
                {selectedSale.plans?.name}
              </div>
              <div>
                <span className="font-medium">Precio: </span>
                {formatCurrency(Number(selectedSale.plans?.price || 0))}
              </div>
              <div>
                <span className="font-medium">Monto Total: </span>
                {formatCurrency(Number(selectedSale.total_amount || 0))}
              </div>
              <div>
                <span className="font-medium">Contrato #: </span>
                {selectedSale.contract_number || 'Sin asignar'}
              </div>
            </CardContent>
          </Card>

          {/* Adherentes (excluye titular) */}
          {(() => {
            const adherentes = (selectedSale.beneficiaries || []).filter((b: any) => !b.is_primary);
            if (adherentes.length === 0) return null;
            return (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Adherentes ({adherentes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adherentes.map((ben: any) => (
                      <div key={ben.id} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {ben.first_name} {ben.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {ben.relationship} • C.I.: {ben.dni || 'No especificado'}
                            </div>
                          </div>
                        </div>
                        {/* Beneficiary Documents */}
                        {ben.beneficiary_documents && ben.beneficiary_documents.length > 0 && (
                          <div className="border-t pt-2 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Documentos adjuntos ({ben.beneficiary_documents.length})</p>
                            {ben.beneficiary_documents.map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3" />
                                  <span>{doc.file_name}</span>
                                  {doc.is_verified && (
                                    <Badge variant="outline" className="text-green-600 border-green-600 text-[10px]">
                                      <CheckCircle className="h-2 w-2 mr-1" />Verificado
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from('beneficiary-documents')
                                      .createSignedUrl(doc.file_url, 3600);
                                    if (data?.signedUrl) {
                                      setLightboxUrl(data.signedUrl);
                                      setLightboxName(doc.file_name);
                                      setLightboxType(doc.file_type || '');
                                      setLightboxOpen(true);
                                    }
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Declaración Jurada de Salud */}
          {selectedSale.beneficiaries?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5" />
                  Declaración Jurada de Salud
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedSale.beneficiaries.map((ben: any) => (
                    <div key={ben.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ben.first_name} {ben.last_name}</span>
                        {ben.is_primary && <Badge variant="outline" className="text-xs">Titular</Badge>}
                        {!ben.is_primary && ben.relationship && (
                          <Badge variant="outline" className="text-xs">{ben.relationship}</Badge>
                        )}
                      </div>
                      <BeneficiaryHealthView beneficiary={ben} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents (generated) */}
          {selectedSale.documents?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos Generados ({selectedSale.documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedSale.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{doc.name}</span>
                      </div>
                      <Badge variant={doc.status === 'firmado' ? 'default' : 'outline'}>
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploaded Sale Documents (attachments) */}
          {selectedSale.sale_documents?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos Adjuntos ({selectedSale.sale_documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedSale.sale_documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <span className="font-medium">{doc.file_name}</span>
                          {doc.file_size && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({(doc.file_size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.file_type && (
                          <Badge variant="outline">{doc.file_type?.split('/').pop()}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { data, error } = await supabase.storage
                              .from('documents')
                              .createSignedUrl(doc.file_url, 3600);
                            if (error || !data) {
                              toast({ title: 'Error', description: 'No se pudo generar el enlace', variant: 'destructive' });
                              return;
                            }
                            if (doc.file_type?.startsWith('image/')) {
                              setLightboxUrl(data.signedUrl);
                              setLightboxName(doc.file_name);
                              setLightboxType(doc.file_type || '');
                              setLightboxOpen(true);
                            } else if (doc.file_type === 'application/pdf' || /\.(pdf|doc|docx)$/i.test(doc.file_name)) {
                              setLightboxUrl(data.signedUrl);
                              setLightboxName(doc.file_name);
                              setLightboxType(doc.file_type || '');
                              setLightboxOpen(true);
                            } else {
                              window.open(data.signedUrl, '_blank');
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { data, error } = await supabase.storage
                              .from('documents')
                              .createSignedUrl(doc.file_url, 300);
                            if (error || !data) return;
                            const link = document.createElement('a');
                            link.href = data.signedUrl;
                            link.download = doc.file_name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show message if no documents at all */}
          {(!selectedSale.documents?.length && !selectedSale.sale_documents?.length) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">No hay documentos cargados para esta venta</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Decisión de Auditoría</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notas de Auditoría</label>
                <Textarea
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="Escriba sus observaciones aquí..."
                  rows={4}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => approveSale.mutate(selectedSale.id)}
                  disabled={approveSale.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar Venta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => requestMoreInfo.mutate(selectedSale.id)}
                  disabled={requestMoreInfo.isPending || !auditNotes.trim()}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Solicitar Información
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectSale.mutate(selectedSale.id)}
                  disabled={rejectSale.isPending || !auditNotes.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  ) : null;

  const listView = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de Auditoría</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Info Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.infoRequired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, contrato o plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="borrador">Borradores</SelectItem>
                <SelectItem value="aprobado">Aprobados</SelectItem>
                <SelectItem value="rechazado">Rechazados</SelectItem>
                <SelectItem value="requiere_info">Info Requerida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas para Auditar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : filteredSales.length > 0 ? (
            <div className="space-y-3">
              {filteredSales.map((sale: any) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {sale.clients?.first_name} {sale.clients?.last_name}
                      </span>
                      {getStatusBadge(sale.status, sale.audit_status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {sale.plans?.name} • {formatCurrency(Number(sale.total_amount || 0))}
                      {sale.contract_number && ` • #${sale.contract_number}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vendedor: {sale.profiles?.first_name} {sale.profiles?.last_name}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSale(sale)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Revisar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay ventas que coincidan con los filtros
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {selectedSale ? detailView : listView}
      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={lightboxUrl}
        fileName={lightboxName}
        fileType={lightboxType}
      />
    </>
  );
};
