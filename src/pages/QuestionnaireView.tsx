
import { useParams, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DynamicQuestionnaire } from "@/components/DynamicQuestionnaire";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTemplates } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const QuestionnaireView = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const saleId = searchParams.get("sale_id");

  // Fetch sale data using token instead of separate params
  const { data: saleData, isLoading: loadingSale } = useQuery({
    queryKey: ["public-sale-questionnaire", token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          clients(*),
          plans(*),
          templates(*)
        `)
        .eq("signature_token", token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { templates } = useTemplates();
  const template = saleData?.templates || templates?.find(t => t.id === saleData?.template_id);

  if (loadingSale) {
    return (
      <Layout title="Cargando cuestionario..." description="">
        <div className="flex justify-center py-8">
          <p>Cargando cuestionario...</p>
        </div>
      </Layout>
    );
  }

  // Check if token is expired
  const isExpired = saleData?.signature_expires_at && new Date(saleData.signature_expires_at) < new Date();
  
  if (!template || !saleData?.clients?.id || !saleData?.template_id || isExpired) {
    return (
      <Layout title="Cuestionario no encontrado" description="">
        <div className="flex justify-center py-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Cuestionario no encontrado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                {isExpired 
                  ? "El enlace del cuestionario ha expirado." 
                  : "El enlace del cuestionario no es válido o ha expirado."
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const client = saleData.clients;
  const plan = saleData.plans;

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
              <Badge variant="secondary">
                Template
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
          templateId={saleData.template_id}
          saleId={saleData.id}
          signatureToken={token}
          onComplete={() => {
            console.log("Cuestionario completado");
          }}
        />
      </div>
    </Layout>
  );
};

export default QuestionnaireView;
