import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit3, Trash2, Search, ExternalLink, Layers3, Sparkles, CheckCircle2, Clock3 } from "lucide-react";
import { TemplateForm } from "@/components/TemplateForm";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRolePermissions } from "@/hooks/useRolePermissions";

type Template = Database["public"]["Tables"]["templates"]["Row"];
type ExtendedTemplate = Template & {
  question_count?: number;
  company?: { name: string } | null;
};

const Templates = () => {
  const navigate = useNavigate();
  const { templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { can } = useRolePermissions();

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const typedTemplates = templates as ExtendedTemplate[];

  const handleEditTemplate = (template: Template) => {
    if (openInNewTab) {
      window.open(`/templates/edit/${template.id}`, "_blank");
      return;
    }
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate.mutateAsync(templateId);
  };

  const handleCloseForm = () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
  };

  const filteredTemplates = typedTemplates
    .filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? template.is_active : !template.is_active;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "version") return (b.version || 0) - (a.version || 0);
      return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
    });

  const canDeleteTemplate = () => {
    return can('templates', 'delete');
  };

  const totalTemplates = typedTemplates.length;
  const activeTemplates = typedTemplates.filter((t) => t.is_active).length;
  const inactiveTemplates = totalTemplates - activeTemplates;
  const templatesWithQuestions = typedTemplates.filter((t) => (t.question_count || 0) > 0).length;

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
    <Layout title="Gestión de Templates" description="Administrar plantillas de documentos">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/10 p-5">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Templates</h2>
              <p className="text-muted-foreground">Diseña, organiza y publica plantillas profesionales sin fricción.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Switch id="openInNewTab" checked={openInNewTab} onCheckedChange={setOpenInNewTab} />
                <label htmlFor="openInNewTab" className="text-sm text-muted-foreground">
                  Abrir editor en nueva pestaña
                </label>
              </div>
              <Button onClick={() => setShowTemplateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Template
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="border-border/60 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Layers3 className="h-3.5 w-3.5" />
                  Total
                </p>
                <p className="text-2xl font-bold">{totalTemplates}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Activos
                </p>
                <p className="text-2xl font-bold">{activeTemplates}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />
                  Inactivos
                </p>
                <p className="text-2xl font-bold">{inactiveTemplates}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Con Preguntas
                </p>
                <p className="text-2xl font-bold">{templatesWithQuestions}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Buscar y Filtrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Más recientes</SelectItem>
                  <SelectItem value="name">Nombre (A-Z)</SelectItem>
                  <SelectItem value="version">Versión más alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
                Todos ({totalTemplates})
              </Button>
              <Button variant={statusFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("active")}>
                Activos ({activeTemplates})
              </Button>
              <Button variant={statusFilter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("inactive")}>
                Inactivos ({inactiveTemplates})
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {template.description || "Sin descripción"}
                      {template.company?.name ? ` · ${template.company.name}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/templates/${template.id}`)} title="Ver template">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)} title="Editar template">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    {openInNewTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/templates/edit/${template.id}`, "_blank")}
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteTemplate() && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" title="Eliminar template">
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preguntas:</span>
                    <Badge variant="secondary">{template.question_count || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  {template.created_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Creado:</span>
                      <span>{format(new Date(template.created_at), "dd/MM/yyyy", { locale: es })}</span>
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
              {searchTerm || statusFilter !== "all"
                ? "No se encontraron templates que coincidan con los filtros."
                : "No hay templates registrados"}
            </p>
          </div>
        )}

        <TemplateForm open={showTemplateForm} onOpenChange={handleCloseForm} template={editingTemplate} />
      </div>
    </Layout>
  );
};

export default Templates;
