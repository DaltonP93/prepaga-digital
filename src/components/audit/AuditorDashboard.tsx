
import React, { useState } from 'react';
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
  FileText, User, DollarSign, Calendar, Filter, Download
} from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';

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
        query = query.eq('status', 'en_auditoria');
      } else if (statusFilter === 'aprobado') {
        query = query.eq('audit_status', 'aprobado');
      } else if (statusFilter === 'rechazado') {
        query = query.eq('audit_status', 'rechazado');
      } else if (statusFilter === 'requiere_info') {
        query = query.eq('audit_status', 'requiere_info');
      } else {
        // 'all' - show all sales that are or were in audit
        query = query.or('status.eq.en_auditoria,audit_status.neq.null');
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

      return (data || []).map((s: any) => ({ ...s, profiles: profilesMap[s.salesperson_id] || null }));
    },
  });

  // Approve sale - changes status to 'pendiente' (approved, ready for next steps)
  const approveSale = useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from('sales')
        .update({
          audit_status: 'aprobado',
          auditor_id: profile?.id,
          audited_at: new Date().toISOString(),
          audit_notes: auditNotes || 'Aprobado sin observaciones',
          status: 'pendiente',
        })
        .eq('id', saleId);

      if (error) throw error;

      // Log workflow state change
      await supabase.from('sale_workflow_states').insert({
        sale_id: saleId,
        previous_status: 'en_auditoria',
        new_status: 'pendiente',
        changed_by: profile?.id,
        change_reason: `Aprobado por auditor: ${auditNotes || 'Sin observaciones'}`,
        metadata: { audit_notes: auditNotes },
      });

      // Log to process traces
      await supabase.from('process_traces').insert({
        sale_id: saleId,
        action: 'audit_approved',
        user_id: profile?.id,
        details: { audit_notes: auditNotes, new_status: 'pendiente' },
      });

      // Notify vendedor
      const saleData = sales.find((s: any) => s.id === saleId);
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
        description: 'La venta ha sido aprobada y pasa a estado Pendiente.',
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
        previous_status: 'en_auditoria',
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
      const saleData = sales.find((s: any) => s.id === saleId);
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
        previous_status: 'en_auditoria',
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
      const saleData = sales.find((s: any) => s.id === saleId);
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
      case 'en_auditoria':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />En Auditoría</Badge>;
      case 'pendiente':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Pendiente (Aprobado)</Badge>;
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
    pending: sales.filter((s: any) => s.status === 'en_auditoria').length,
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
                <span className="font-medium">DNI: </span>
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

          {/* Beneficiaries */}
          {selectedSale.beneficiaries?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Beneficiarios ({selectedSale.beneficiaries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSale.beneficiaries.map((ben: any) => (
                    <div key={ben.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{ben.first_name} {ben.last_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {ben.relationship} • {ben.dni || 'Sin DNI'}
                      </div>
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
