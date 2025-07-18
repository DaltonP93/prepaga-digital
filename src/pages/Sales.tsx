
import React, { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Users, FileText, MessageSquare, CheckSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BeneficiariesManager } from '@/components/BeneficiariesManager';
import { SaleDocuments } from '@/components/SaleDocuments';
import { SaleNotes } from '@/components/SaleNotes';
import { SaleRequirements } from '@/components/SaleRequirements';
import { DocumentTrackingPanel } from '@/components/DocumentTrackingPanel';

export default function Sales() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data: sales, isLoading } = useSales();

  const getStatusBadge = (status: string) => {
    const badges = {
      borrador: { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
      enviado: { label: 'Enviado', className: 'bg-blue-100 text-blue-800' },
      firmado: { label: 'Firmado', className: 'bg-green-100 text-green-800' },
      completado: { label: 'Completado', className: 'bg-purple-100 text-purple-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status as keyof typeof badges] || badges.borrador;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredSales = sales?.filter(sale => {
    const matchesSearch = !search || 
      sale.request_number?.toLowerCase().includes(search.toLowerCase()) ||
      sale.contract_number?.toLowerCase().includes(search.toLowerCase()) ||
      sale.clients?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      sale.clients?.last_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const openModal = (modalType: string, saleId: string) => {
    setSelectedSale(saleId);
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedSale(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Ventas</h1>
          <p className="text-muted-foreground">
            Administra todas las ventas y contratos del sistema
          </p>
        </div>
        <Link to="/sales/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de solicitud, contrato o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="firmado">Firmado</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ventas */}
      <div className="grid gap-4">
        {filteredSales && filteredSales.length > 0 ? (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {sale.clients?.first_name} {sale.clients?.last_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Nº Solicitud: <strong>{sale.request_number || 'Generando...'}</strong></span>
                          <span>Nro. Contrato: <strong>{sale.contract_number || 'Generando...'}</strong></span>
                          <span>Plan: {sale.plans?.name}</span>
                        </div>
                      </div>
                      {getStatusBadge(sale.status || 'borrador')}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Creado: {new Date(sale.created_at || '').toLocaleDateString()}</span>
                      {sale.sale_date && (
                        <span>• Fecha de venta: {new Date(sale.sale_date).toLocaleDateString()}</span>
                      )}
                      {sale.total_amount && (
                        <span>• Monto: ${Number(sale.total_amount).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal('beneficiaries', sale.id)}
                      className="flex items-center gap-1"
                    >
                      <Users className="h-4 w-4" />
                      Beneficiarios
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal('documents', sale.id)}
                      className="flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      Digitalizaciones
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal('notes', sale.id)}
                      className="flex items-center gap-1"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Novedades
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal('requirements', sale.id)}
                      className="flex items-center gap-1"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Requisitos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal('tracking', sale.id)}
                      className="flex items-center gap-1"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Tracking
                    </Button>
                    <Link to={`/sales/${sale.id}`}>
                      <Button size="sm" className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Ver documento
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="text-muted-foreground">
                  {search || statusFilter !== 'all' 
                    ? 'No se encontraron ventas con los filtros aplicados' 
                    : 'No hay ventas registradas'
                  }
                </div>
                <Link to="/sales/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera venta
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modales */}
      {selectedSale && (
        <>
          <BeneficiariesManager
            saleId={selectedSale}
            open={activeModal === 'beneficiaries'}
            onOpenChange={closeModal}
          />
          <SaleDocuments
            saleId={selectedSale}
            open={activeModal === 'documents'}
            onOpenChange={closeModal}
          />
          <SaleNotes
            saleId={selectedSale}
            open={activeModal === 'notes'}
            onOpenChange={closeModal}
          />
          <SaleRequirements
            saleId={selectedSale}
            open={activeModal === 'requirements'}
            onOpenChange={closeModal}
          />
          {activeModal === 'tracking' && (
            <Card className="fixed inset-4 z-50 overflow-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tracking de Documentos</CardTitle>
                  <Button variant="ghost" onClick={closeModal}>×</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentTrackingPanel saleId={selectedSale} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
