
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Link, Eye, FileText, Download, MessageSquare } from "lucide-react";
import { SaleForm } from "@/components/SaleForm";
import { useSales, useGenerateSignatureLink, useGenerateQuestionnaireLink } from "@/hooks/useSales";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { SearchAndFilters, FilterOptions } from "@/components/SearchAndFilters";
import { generatePDFContent, downloadPDF } from "@/lib/pdfGenerator";

type Sale = Database['public']['Tables']['sales']['Row'] & {
  clients?: { first_name: string; last_name: string; email: string; phone: string };
  plans?: { name: string; price: number };
  salesperson?: { first_name: string; last_name: string };
  companies?: { name: string };
  templates?: { name: string };
};

const Sales = () => {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({ search: '' });
  const { data: sales = [], isLoading } = useSales();
  const generateSignatureLink = useGenerateSignatureLink();
  const generateQuestionnaireLink = useGenerateQuestionnaireLink();
  const { toast } = useToast();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completado': return 'default';
      case 'firmado': return 'secondary';
      case 'enviado': return 'outline';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'borrador': return 'Borrador';
      case 'enviado': return 'Enviado';
      case 'firmado': return 'Firmado';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleGenerateQuestionnaireLink = async (sale: Sale) => {
    try {
      const result = await generateQuestionnaireLink.mutateAsync(sale.id);
      
      if (result.questionnaireUrl) {
        // Remove any trailing '=' from the URL
        const cleanUrl = result.questionnaireUrl.replace(/=+$/, '');
        
        // Copy clean URL to clipboard
        await navigator.clipboard.writeText(cleanUrl);
        
        toast({
          title: "Enlace del cuestionario generado",
          description: "El enlace ha sido copiado al portapapeles.",
        });
      }
    } catch (error) {
      console.error('Error generating questionnaire link:', error);
    }
  };

  const handleGenerateSignatureLink = async (sale: Sale) => {
    try {
      const result = await generateSignatureLink.mutateAsync(sale.id);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(result.signatureUrl);
      
      toast({
        title: "Enlace generado",
        description: "El enlace de firma ha sido copiado al portapapeles.",
      });
    } catch (error) {
      console.error('Error generating signature link:', error);
    }
  };

  const handleDownloadContract = async (sale: Sale) => {
    if (!sale.clients || !sale.plans || !sale.companies) {
      toast({
        title: "Error",
        description: "Faltan datos para generar el contrato.",
        variant: "destructive",
      });
      return;
    }

    const pdfData = {
      content: `
        CONTRATO DE SERVICIO

        Por el presente documento, ${sale.companies.name} (en adelante "LA EMPRESA") 
        y ${sale.clients.first_name} ${sale.clients.last_name} (en adelante "EL CLIENTE") 
        acuerdan los siguientes términos:

        1. OBJETO DEL CONTRATO
        La empresa se compromete a brindar los servicios del plan "${sale.plans.name}" 
        por un valor de $${sale.plans.price}.

        2. VIGENCIA
        El presente contrato entra en vigencia a partir de la fecha de firma.

        3. CONDICIONES
        - Plan contratado: ${sale.plans.name}
        - Precio: $${sale.plans.price}
        - Cliente: ${sale.clients.first_name} ${sale.clients.last_name}
        - Email: ${sale.clients.email}
        ${sale.clients.phone ? `- Teléfono: ${sale.clients.phone}` : ''}

        4. FIRMAS
        Este documento ha sido firmado digitalmente por ambas partes.
      `,
      signatures: [], // Add actual signatures if available
      client: sale.clients,
      plan: sale.plans,
      company: sale.companies,
    };

    const htmlContent = generatePDFContent(pdfData);
    await downloadPDF(htmlContent, `Contrato-${sale.clients.first_name}-${sale.clients.last_name}.pdf`);
  };

  const handleCloseForm = () => {
    setShowSaleForm(false);
    setEditingSale(null);
  };

  const filteredSales = sales.filter(sale => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const clientName = sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}`.toLowerCase() : '';
      const planName = sale.plans?.name?.toLowerCase() || '';
      const companyName = sale.companies?.name?.toLowerCase() || '';
      
      if (!clientName.includes(searchTerm) && !planName.includes(searchTerm) && !companyName.includes(searchTerm)) {
        return false;
      }
    }
    
    if (filters.status && sale.status !== filters.status) {
      return false;
    }
    
    return true;
  });

  const statusOptions = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'firmado', label: 'Firmado' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  const handleExport = () => {
    const csvContent = [
      ['Cliente', 'Plan', 'Empresa', 'Vendedor', 'Monto', 'Estado', 'Fecha'].join(','),
      ...filteredSales.map(sale => [
        `"${sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}"`,
        `"${sale.plans?.name || 'Sin plan'}"`,
        `"${sale.companies?.name || 'Sin empresa'}"`,
        `"${sale.salesperson ? `${sale.salesperson.first_name} ${sale.salesperson.last_name}` : 'Sin vendedor'}"`,
        sale.total_amount || 0,
        `"${getStatusLabel(sale.status || 'borrador')}"`,
        `"${sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '-'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout title="Gestión de Ventas" description="Administrar ventas y contratos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Gestión de Ventas" 
      description="Administrar ventas y contratos"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
            <p className="text-muted-foreground">
              Gestiona las ventas y el proceso de firmas
            </p>
          </div>
          <Button onClick={() => setShowSaleForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </div>

        <SearchAndFilters
          filters={filters}
          onFiltersChange={setFilters}
          statusOptions={statusOptions}
          showExport={true}
          onExport={handleExport}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de Ventas</CardTitle>
            <CardDescription>
              {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}
                    </TableCell>
                    <TableCell>
                      {sale.plans?.name || 'Sin plan'}
                    </TableCell>
                    <TableCell>
                      {sale.templates?.name ? (
                        <Badge variant="outline">{sale.templates.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Sin template</span>
                      )}
                    </TableCell>
                    <TableCell>
                      ${sale.total_amount || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sale.status || 'borrador')}>
                        {getStatusLabel(sale.status || 'borrador')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.salesperson ? `${sale.salesperson.first_name} ${sale.salesperson.last_name}` : 'Sin vendedor'}
                    </TableCell>
                    <TableCell>
                      {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSale(sale)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadContract(sale)}
                          title="Descargar contrato"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        {sale.status === 'borrador' && sale.template_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateQuestionnaireLink(sale)}
                            disabled={generateQuestionnaireLink.isPending}
                            title="Enviar cuestionario"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {sale.status === 'borrador' && !sale.template_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSignatureLink(sale)}
                            disabled={generateSignatureLink.isPending}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {sale.signature_token && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(
                              sale.template_id 
                                ? `/questionnaire/${sale.signature_token}`
                                : `/signature/${sale.signature_token}`, 
                              '_blank'
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredSales.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {filters.search || filters.status ? 'No se encontraron ventas que coincidan con los filtros' : 'No hay ventas registradas'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <SaleForm
          open={showSaleForm}
          onOpenChange={handleCloseForm}
          sale={editingSale}
        />
      </div>
    </Layout>
  );
};

export default Sales;
