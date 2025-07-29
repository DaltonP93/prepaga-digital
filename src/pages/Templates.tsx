import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Filter,
  FileText,
  ExternalLink,
  History
} from "lucide-react";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { TemplateForm } from "@/components/TemplateForm";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Template = Database['public']['Tables']['templates']['Row'] & {
  company?: { name: string } | null;
  creator?: { first_name: string; last_name: string } | null;
  question_count?: number;
};

export default function Templates() {
  const { templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [openInNewTab, setOpenInNewTab] = useState(false);

  useEffect(() => {
    if (deleteTemplate.isSuccess) {
      toast({
        title: "Template eliminado",
        description: "El template ha sido eliminado exitosamente.",
      });
    }

    if (deleteTemplate.isError) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el template. Intente nuevamente.",
        variant: "destructive",
      });
    }
  }, [deleteTemplate.isSuccess, deleteTemplate.isError, toast]);

  const filteredTemplates = templates?.filter((template) =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleDelete = async (template: Template) => {
    if (window.confirm(`¿Está seguro que desea eliminar el template "${template.name}"?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
        toast({
          title: "Template eliminado",
          description: `El template "${template.name}" ha sido eliminado exitosamente.`,
        });
      } catch (error) {
        console.error('Error deleting template:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el template. Intente nuevamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormMode('create');
    if (openInNewTab) {
      // Open in new tab
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>Nuevo Template</title>
              <link rel="stylesheet" href="/src/index.css">
            </head>
            <body>
              <div id="template-form-root"></div>
              <script type="module">
                import { TemplateForm } from '/src/components/TemplateForm.tsx';
                // This would need proper React setup in new tab
              </script>
            </body>
          </html>
        `);
        newTab.document.close();
      }
    } else {
      setFormOpen(true);
    }
  };

  const handleOpenInNewTab = (template: Template) => {
    const url = `/templates/edit/${template.id}`;
    window.open(url, '_blank', 'width=1200,height=800');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando templates...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Gestiona los templates de documentos</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="rounded"
            />
            Abrir en nueva pestaña
          </label>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Template
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      v{template.version || 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {template.question_count || 0} preguntas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenInNewTab(template)}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    disabled={deleteTemplate.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {template.description || "Sin descripción"}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {template.creator?.first_name} {template.creator?.last_name}
                </span>
                <span>
                  {new Date(template.created_at!).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay templates</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No se encontraron templates que coincidan con tu búsqueda.' : 'Comienza creando tu primer template.'}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Template
            </Button>
          )}
        </div>
      )}

      <TemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
