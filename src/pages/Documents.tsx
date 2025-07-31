
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { DocumentForm } from "@/components/DocumentForm";
import { useDocuments } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileText, ExternalLink, Download, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SearchAndFilters, FilterOptions } from "@/components/SearchAndFilters";
import { TemplateVariables } from "@/components/TemplateVariables";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generatePDFContent, downloadPDF } from "@/lib/pdfGenerator";
import { interpolateTemplate, createTemplateContext } from "@/lib/templateEngine";

const Documents = () => {
  const { documents, isLoading, deleteDocument } = useDocuments();
  const [filters, setFilters] = useState<FilterOptions>({ search: '' });
  const [showVariables, setShowVariables] = useState(false);

  if (isLoading) {
    return (
      <Layout 
        title="Gestión de Documentos" 
        description="Administrar documentos y seguimiento de firmas"
      >
        <div className="space-y-6">
          <p>Cargando documentos...</p>
        </div>
      </Layout>
    );
  }

  const filteredDocuments = documents?.filter(doc => {
    if (filters.search && !doc.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const handlePreviewDocument = (document: any) => {
    if (document.sales) {
      const context = createTemplateContext(
        document.sales.clients,
        document.sales.plans,
        document.sales.companies,
        document.sales
      );
      const processedContent = interpolateTemplate(document.content || '', context);
      
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Vista previa: ${document.name}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
              <h1>${document.name}</h1>
              <hr>
              ${processedContent.replace(/\n/g, '<br>')}
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  const handleDownloadPDF = async (document: any) => {
    if (document.sales) {
      const context = createTemplateContext(
        document.sales.clients,
        document.sales.plans,
        document.sales.companies,
        document.sales
      );
      
      const pdfData = {
        content: interpolateTemplate(document.content || '', context),
        signatures: [], // Add signatures if available
        client: document.sales.clients,
        plan: document.sales.plans,
        company: document.sales.companies,
      };
      
      const htmlContent = generatePDFContent(pdfData);
      await downloadPDF(htmlContent, `${document.name}.pdf`);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Borrador' },
    { value: 'active', label: 'Activo' },
    { value: 'archived', label: 'Archivado' },
  ];

  return (
    <Layout 
      title="Gestión de Documentos" 
      description="Administrar documentos y seguimiento de firmas"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Documentos</h2>
            <p className="text-muted-foreground">
              Gestiona los documentos del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showVariables} onOpenChange={setShowVariables}>
              <DialogTrigger asChild>
                <Button variant="outline">Variables</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Variables de Template</DialogTitle>
                  <DialogDescription>
                    Variables disponibles para usar en tus documentos
                  </DialogDescription>
                </DialogHeader>
                <TemplateVariables />
              </DialogContent>
            </Dialog>
            <DocumentForm />
          </div>
        </div>

        <SearchAndFilters
          filters={filters}
          onFiltersChange={setFilters}
          statusOptions={statusOptions}
          showExport={true}
          onExport={() => {
            // Export functionality can be implemented here
            console.log('Exporting documents...');
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de Documentos</CardTitle>
            <CardDescription>
              {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''} encontrado{filteredDocuments.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!filteredDocuments || filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay documentos que coincidan con los filtros</p>
                <DocumentForm trigger={
                  <Button className="mt-4">Crear primer documento</Button>
                } />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Obligatorio</TableHead>
                    <TableHead>Archivo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {document.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {document.document_type || "Sin tipo"}
                      </TableCell>
                      <TableCell>
                        {document.plans?.name || "Todos"}
                      </TableCell>
                      <TableCell>
                        {document.templates?.name || "Sin template"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {document.order_index}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={document.is_required ? "default" : "secondary"}>
                          {document.is_required ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {document.file_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(document.file_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">Sin archivo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {document.content && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewDocument(document)}
                                title="Vista previa"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(document)}
                                title="Descargar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <DocumentForm document={document} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El documento "{document.name}" será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDocument(document.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Documents;
