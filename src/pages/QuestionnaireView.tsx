import { useParams, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DynamicQuestionnaire } from "@/components/DynamicQuestionnaire";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTemplates } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const QuestionnaireView = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const saleId = searchParams.get("sale_id");
  const signature_token = searchParams.get("signature_token");

  const { templates } = useTemplates();
  const template = templates?.find(t => t.id === templateId);

  // Fetch sale and client data for public access
  const { data: saleData, isLoading: loadingSale } = useQuery({
    queryKey: ["public-sale", saleId, signature_token],
    queryFn: async () => {
      if (!saleId || !signature_token) return null;
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          clients(*),
          plans(*)
        `)
        .eq("id", saleId)
        .eq("signature_token", signature_token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!saleId && !!signature_token,
  });

  if (loadingSale) {
    return (
      <Layout title="Cargando cuestionario..." description="">
        <div className="flex justify-center py-8">
          <p>Cargando cuestionario...</p>
        </div>
      </Layout>
    );
  }

  if (!template || !clientId) {
    return (
      <Layout title="Cuestionario no encontrado" description="">
        <div className="flex justify-center py-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Cuestionario no encontrado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                El enlace del cuestionario no es válido o ha expirado.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const client = saleData?.clients;
  const plan = saleData?.plans;

  return (
    <Layout 
      title={template.name} 
      description={template.description || "Complete el siguiente cuestionario"}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{template.name}</CardTitle>
                {template.description && (
                  <p className="text-muted-foreground mt-1">{template.description}</p>
                )}
              </div>
              <Badge variant={template.is_global ? "default" : "secondary"}>
                {template.is_global ? "Global" : "Empresa"}
              </Badge>
            </div>
          </CardHeader>
          {(client || plan) && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {client && (
                  <div>
                    <h4 className="font-medium">Cliente:</h4>
                    <p>{client.first_name} {client.last_name}</p>
                    <p className="text-muted-foreground">{client.email}</p>
                  </div>
                )}
                {plan && (
                  <div>
                    <h4 className="font-medium">Plan:</h4>
                    <p>{plan.name}</p>
                    <p className="text-muted-foreground">${plan.price?.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Questionnaire */}
        <DynamicQuestionnaire
          templateId={templateId}
          clientId={clientId}
          saleId={saleId}
          onComplete={() => {
            // Redirect to success page or show success message
            window.location.href = `/signature/${saleId}?signature_token=${signature_token}`;
          }}
        />
      </div>
    </Layout>
  );
};

export default QuestionnaireView;