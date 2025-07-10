
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
import { Trash2, FileText, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Documents = () => {
  const { documents, isLoading, deleteDocument } = useDocuments();

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
          <DocumentForm />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Documentos</CardTitle>
            <CardDescription>
              Documentos disponibles en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay documentos creados</p>
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
                  {documents.map((document) => (
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
                        {document.plan?.name || "Todos"}
                      </TableCell>
                      <TableCell>
                        {document.template?.name || "Sin template"}
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
