
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
  FileText, User, DollarSign, Calendar, Filter
} from 'lucide-react';

export const AuditorDashboard: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
          profiles:salesperson_id (first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Filter by audit status
      if (statusFilter === 'pending') {
        query = query.in('audit_status', ['pendiente', null]);
      } else if (statusFilter !== 'all') {
        query = query.eq('audit_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Approve sale
  const approveSale = useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from('sales')
        .update({
          audit_status: 'aprobado',
          auditor_id: profile?.id,
          audited_at: new Date().toISOString(),
          audit_notes: auditNotes || 'Aprobado sin observaciones',
          status: 'completado',
        })
        .eq('id', saleId);

      if (error) throw error;

      // Log workflow state change
      await supabase.from('sale_workflow_states').insert({
        sale_id: saleId,
        previous_status: selectedSale?.status,
        new_status: 'completado',
        changed_by: profile?.id,
        change_reason: 'Aprobado por auditor',
        metadata: { audit_notes: auditNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      setSelectedSale(null);
      setAuditNotes('');
      toast({
        title: 'Venta aprobada',
        description: 'La venta ha sido aprobada y completada.',
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

  // Reject sale
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
          status: 'cancelado',
        })
        .eq('id', saleId);

      if (error) throw error;

      // Log workflow state change
      await supabase.from('sale_workflow_states').insert({
        sale_id: saleId,
        previous_status: selectedSale?.status,
        new_status: 'cancelado',
        changed_by: profile?.id,
        change_reason: `Rechazado: ${auditNotes}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      setSelectedSale(null);
      setAuditNotes('');
      toast({
        title: 'Venta rechazada',
        description: 'La venta ha sido rechazada.',
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      setSelectedSale(null);
      setAuditNotes('');
      toast({
        title: 'Solicitud enviada',
        description: 'Se ha solicitado información adicional al vendedor.',
      });
    },
  });

  const getStatusBadge = (status: string, auditStatus: string | null) => {
    if (auditStatus === 'aprobado') {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>;
    }
    if (auditStatus === 'rechazado') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
    }
    if (auditStatus === 'requiere_info') {
      return <Badge variant="outline" className="text-orange-600"><AlertCircle className="h-3 w-3 mr-1" />Info Requerida</Badge>;
    }

    switch (status) {
      case 'firmado':
        return <Badge variant="outline" className="text-blue-600"><Clock className="h-3 w-3 mr-1" />Pendiente Auditoría</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="text-yellow-600">Enviado</Badge>;
      default:
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
    pending: sales.filter((s: any) => !s.audit_status || s.audit_status === 'pendiente').length,
    approved: sales.filter((s: any) => s.audit_status === 'aprobado').length,
    rejected: sales.filter((s: any) => s.audit_status === 'rechazado').length,
    infoRequired: sales.filter((s: any) => s.audit_status === 'requiere_info').length,
  };

  if (selectedSale) {
    return (
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

          {/* Documents */}
          {selectedSale.documents?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos ({selectedSale.documents.length})
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
    );
  }

  return (
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
};
