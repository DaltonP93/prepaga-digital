
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, MoreHorizontal, FileText, Eye, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { useSales, useDeleteSale } from '@/hooks/useSales';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import RequireAuth from '@/components/RequireAuth';
import { useState, useEffect } from 'react';
import { useStateTransition } from '@/hooks/useStateTransition';
import { ALL_SALE_STATUSES, SALE_STATUS_LABELS, type SaleStatus } from '@/types/workflow';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Sales = () => {
  const { data: sales, isLoading } = useSales();
  const queryClient = useQueryClient();
  const deleteSale = useDeleteSale();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const { canViewState, canEditState } = useStateTransition();
  const { profile } = useSimpleAuthContext();

  // Fetch signature links counts per sale for progress
  const saleIds = (sales || []).map(s => s.id);
  const { data: signatureLinksData } = useQuery({
    queryKey: ['sales-signature-progress', saleIds],
    queryFn: async () => {
      if (saleIds.length === 0) return {};
      const { data } = await supabase
        .from('signature_links')
        .select('sale_id, status')
        .in('sale_id', saleIds);
      const map: Record<string, { total: number; completed: number }> = {};
      (data || []).forEach(link => {
        if (!map[link.sale_id]) map[link.sale_id] = { total: 0, completed: 0 };
        map[link.sale_id].total++;
        if (link.status === 'completado') map[link.sale_id].completed++;
      });
      return map;
    },
    enabled: saleIds.length > 0,
  });

  // Fetch document counts per sale
  const { data: documentCountsData } = useQuery({
    queryKey: ['sales-document-counts', saleIds],
    queryFn: async () => {
      if (saleIds.length === 0) return {};
      const { data } = await supabase
        .from('documents')
        .select('sale_id')
        .in('sale_id', saleIds)
        .neq('document_type', 'firma');
      const map: Record<string, number> = {};
      (data || []).forEach(doc => {
        map[doc.sale_id] = (map[doc.sale_id] || 0) + 1;
      });
      return map;
    },
    enabled: saleIds.length > 0,
  });

  // Real-time subscription for sales changes
  useEffect(() => {
    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signature_links' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales-signature-progress'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales-document-counts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const visibleSales = (sales || []).filter((sale) =>
    canViewState((sale.status || 'borrador') as SaleStatus)
  );

  const filteredSales = visibleSales.filter(sale => {
    const matchesSearch = sale.clients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id?.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'firmado':
      case 'completado':
        return 'default';
      case 'enviado':
      case 'en_auditoria':
      case 'pendiente':
        return 'secondary';
      case 'borrador':
        return 'outline';
      case 'cancelado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      firmado: 'Firmado',
      completado: 'Completado',
      enviado: 'Enviado',
      borrador: 'Borrador',
      cancelado: 'Cancelado',
      en_auditoria: 'En Auditoría',
      pendiente: 'Pendiente',
      rechazado: 'Rechazado',
      aprobado_para_templates: 'Aprobado',
    };
    return map[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PY', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <RequireAuth>
        <Layout title="Ventas" description="Gestión de ventas">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Layout title="Administra todos tus contratos y documentos" description="">
        <div className="space-y-6">
          {/* Header con búsqueda y filtros */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de contrato o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {ALL_SALE_STATUSES
                    .filter((state) => canViewState(state))
                    .map((state) => (
                      <SelectItem key={state} value={state}>
                        {SALE_STATUS_LABELS[state]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/sales/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Contrato
                </Link>
              </Button>
            </div>
          </div>

          {/* Tabla de contratos */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">CONTRATO</TableHead>
                      <TableHead className="font-semibold">CLIENTE</TableHead>
                      <TableHead className="font-semibold">ESTADO</TableHead>
                      <TableHead className="font-semibold">MONTO</TableHead>
                      <TableHead className="font-semibold">PROGRESO</TableHead>
                      <TableHead className="font-semibold">DOCUMENTOS</TableHead>
                      <TableHead className="font-semibold">FECHA</TableHead>
                      <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length > 0 ? (
                      filteredSales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-primary">
                                {sale.contract_number || `CON-${sale.id?.slice(-4)}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sale.plans?.name || 'Sin plan'}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {sale.clients?.first_name} {sale.clients?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sale.clients?.email}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(sale.status || 'borrador')}>
                              {getStatusText(sale.status || 'borrador')}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="font-semibold">
                              {formatCurrency(sale.total_amount || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">PYG</div>
                          </TableCell>
                          
                          <TableCell>
                            {(() => {
                              const progress = signatureLinksData?.[sale.id];
                              const pct = progress && progress.total > 0
                                ? Math.round((progress.completed / progress.total) * 100)
                                : (sale.status === 'completado' || sale.status === 'firmado' ? 100 : 0);
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>{pct}%</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{documentCountsData?.[sale.id] || 0}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatDate(sale.created_at)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Vence: {sale.signature_expires_at ? formatDate(sale.signature_expires_at) : 'No definido'}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/sales/${sale.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Detalles
                                  </Link>
                                </DropdownMenuItem>
                                {canEditState((sale.status || 'borrador') as SaleStatus) ? (
                                  <DropdownMenuItem asChild>
                                    <Link to={`/sales/${sale.id}/edit`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edición bloqueada por estado/rol
                                  </DropdownMenuItem>
                                )}
                                {sale.salesperson_id === profile?.id && ['borrador', 'rechazado'].includes(sale.status || '') && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Se eliminará la venta y todos sus datos asociados.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteSale.mutate(sale.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="space-y-4">
                            <p className="text-muted-foreground">
                              {searchTerm || statusFilter !== 'todos' 
                                ? 'No se encontraron contratos con los filtros aplicados' 
                                : 'No hay contratos registrados'
                              }
                            </p>
                            <Button asChild>
                              <Link to="/sales/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Primer Contrato
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </RequireAuth>
  );
};

export default Sales;
