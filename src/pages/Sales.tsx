
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, MoreHorizontal, FileText, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import RequireAuth from '@/components/RequireAuth';
import { useState } from 'react';

const Sales = () => {
  const { data: sales, isLoading } = useSales();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filteredSales = sales?.filter(sale => {
    const matchesSearch = sale.clients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id?.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'firmado':
      case 'completado':
        return 'default';
      case 'enviado':
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
    switch (status) {
      case 'firmado':
        return 'Firmado';
      case 'completado':
        return 'Completado';
      case 'enviado':
        return 'Enviado';
      case 'borrador':
        return 'Borrador';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
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
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="firmado">Firmado</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
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
                                CON-{sale.id?.slice(-4)}
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
                            <div className="text-sm text-muted-foreground">USD</div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>0%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all" 
                                  style={{ width: '0%' }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">0</span>
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
                                <DropdownMenuItem asChild>
                                  <Link to={`/sales/${sale.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
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
