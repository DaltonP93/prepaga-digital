
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTemplates } from "@/hooks/useTemplates";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { templates, isLoading, error } = useTemplates();

  const template = templates?.find(t => t.id === id);

  if (isLoading) {
    return (
      <Layout title="Cargando..." description="Cargando datos del template">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Cargando template...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !template) {
    return (
      <Layout title="Error" description="No se pudo cargar el template">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              No se pudo cargar el template solicitado.
            </p>
            <Button onClick={() => navigate('/templates')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Templates
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={template.name} description="Detalle del template">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{template.name}</h1>
            <p className="text-muted-foreground">
              {template.description || 'Sin descripción'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => navigate(`/templates/edit/${template.id}`)} variant="outline">
              <Edit3 className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button onClick={() => navigate('/templates')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Templates
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Contenido del Template</CardTitle>
                <CardDescription>
                  Vista previa del contenido del template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {template.static_content ? (
                    <div dangerouslySetInnerHTML={{ __html: template.static_content }} />
                  ) : (
                    <p className="text-muted-foreground">No hay contenido disponible</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Información del Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Global:</span>
                  <Badge variant={template.is_global ? "default" : "outline"}>
                    {template.is_global ? "Sí" : "No"}
                  </Badge>
                </div>
                {template.created_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Creado:</span>
                    <span>{format(new Date(template.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                  </div>
                )}
                {template.updated_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Actualizado:</span>
                    <span>{format(new Date(template.updated_at), 'dd/MM/yyyy', { locale: es })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
