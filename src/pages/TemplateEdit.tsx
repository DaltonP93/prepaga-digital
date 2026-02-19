
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateForm } from "@/components/TemplateForm";

export default function TemplateEdit() {
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
    <Layout title="Editar Template" description="Modifica los datos del template">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Editar Template</h1>
            <p className="text-muted-foreground">
              Modifica los datos del template seleccionado
            </p>
          </div>
          <Button onClick={() => navigate('/templates')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Templates
          </Button>
        </div>

        <TemplateForm 
          mode="inline"
          open={true} 
          onOpenChange={(open) => !open && navigate('/templates')}
          template={template}
        />
      </div>
    </Layout>
  );
}
