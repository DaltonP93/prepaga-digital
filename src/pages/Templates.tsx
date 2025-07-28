
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { TemplateForm } from "@/components/TemplateForm";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
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
import { Trash2, Plus, Edit, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const Templates = () => {
  const { templates, isLoading, error } = useTemplates();
  const deleteTemplateMutation = useDeleteTemplate();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreateTemplate = () => {
    // Abrir en nueva pestaña
    const newWindow = window.open('', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Nuevo Template</title>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
            .container { max-width: 1200px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Nuevo Template</h1>
            <p>Cargando formulario...</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Alternativa: abrir en la misma ventana pero con más espacio
    setSelectedTemplate(null);
    setIsFormOpen(true);
  };

  const handleEditTemplate = (template: any) => {
    // Abrir en nueva pestaña para edición
    const newWindow = window.open('', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Editar Template: ${template.name}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
            .container { max-width: 1200px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Editar Template: ${template.name}</h1>
            <p>Cargando formulario...</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Alternativa: abrir en la misma ventana
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTemplate(null);
  };

  if (isLoading) {
    return (
      <Layout 
        title="Gestión de Templates" 
        description="Administrar plantillas de documentos"
      >
        <div className="space-y-6">
          <p>Cargando templates...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Gestión de Templates" 
      description="Administrar plantillas de documentos"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Templates</h2>
            <p className="text-muted-foreground">
              Gestiona las plantillas para generar documentos
            </p>
          </div>
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Crear Template
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Templates</CardTitle>
            <CardDescription>
              Templates disponibles para generar documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!templates || templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay templates creados</p>
                <Button onClick={handleCreateTemplate} className="mt-4 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer template
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preguntas</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {template.description || "Sin descripción"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {template.template_type === 'contract' && 'Contrato'}
                          {template.template_type === 'declaration' && 'Declaración Jurada'}
                          {template.template_type === 'questionnaire' && 'Cuestionario'}
                          {template.template_type === 'other' && 'Otro'}
                          {!template.template_type && 'Cuestionario'}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         <Badge variant="outline">
                           {template.question_count || 0} pregunta{template.question_count !== 1 ? 's' : ''}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         {template.company?.name || "Global"}
                       </TableCell>
                       <TableCell>
                         {template.creator ? 
                           `${template.creator.first_name} ${template.creator.last_name}` : 
                           "Sistema"
                         }
                       </TableCell>
                      <TableCell>
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar template?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El template "{template.name}" será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
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

        <TemplateForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          template={selectedTemplate}
        />
      </div>
    </Layout>
  );
};

export default Templates;
