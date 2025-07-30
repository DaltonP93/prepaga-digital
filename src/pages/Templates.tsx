
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit3, Trash2, Filter, Search, ExternalLink } from "lucide-react";
import { TemplateForm } from "@/components/TemplateForm";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

type Template = Database['public']['Tables']['templates']['Row'];

const Templates = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { profile } = useSimpleAuthContext();
  
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const handleEditTemplate = (template: Template) => {
    if (openInNewTab) {
      window.open(`/templates/edit/${template.id}`, '_blank');
    } else {
      setEditingTemplate(template);
      setShowTemplateForm(true);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate.mutateAsync(templateId);
  };

  const handleCloseForm = () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || template.template_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const canDeleteTemplate = (template: Template) => {
    return ['super_admin', 'admin', 'gestor'].includes(profile?.role || '');
  };

  if (isLoading) {
    return (
      <Layout title="Gestión de Templates" description="Administrar plantillas de documentos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
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
            <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
            <p className="text-muted-foreground">
              Gestiona las plantillas de documentos del sistema
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="openInNewTab"
                checked={openInNewTab}
                onCheckedChange={setOpenInNewTab}
              />
              <label htmlFor="openInNewTab" className="text-sm">
                Abrir en nueva pestaña
              </label>
            </div>
            <Button onClick={() => setShowTemplateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Template
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filtros de Búsqueda</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar templates...</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o descripción"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Template</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="contract">Contrato</SelectItem>
                      <SelectItem value="document">Documento</SelectItem>
                      <SelectItem value="form">Formulario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description || 'Sin descripción'}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/templates/${template.id}`)}
                      title="Ver template"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                      title="Editar template"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    {openInNewTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/templates/edit/${template.id}`, '_blank')}
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteTemplate(template) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Eliminar template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente el template "{template.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Versión:</span>
                    <Badge variant="outline">v{template.version}</Badge>
                  </div>
                  {template.template_type && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant="secondary">{template.template_type}</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={template.active ? "default" : "secondary"}>
                      {template.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  {template.created_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Creado:</span>
                      <span>{format(new Date(template.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== "all" 
                ? "No se encontraron templates que coincidan con los filtros." 
                : "No hay templates registrados"}
            </p>
          </div>
        )}

        <TemplateForm
          open={showTemplateForm}
          onOpenChange={handleCloseForm}
          template={editingTemplate}
        />
      </div>
    </Layout>
  );
};

export default Templates;
