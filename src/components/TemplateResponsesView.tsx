import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { useTemplateResponses } from "@/hooks/useTemplateResponses";
import { useTemplateQuestions } from "@/hooks/useTemplateQuestions";
import { generateDocumentWithResponses, createTemplateContext } from "@/lib/templateEngine";
import { downloadPDF } from "@/lib/pdfGenerator";

interface TemplateResponsesViewProps {
  templateId: string;
  clientId?: string;
  saleId?: string;
}

export const TemplateResponsesView = ({ templateId, clientId, saleId }: TemplateResponsesViewProps) => {
  const { responses, responseStats, isLoading } = useTemplateResponses(templateId, clientId, saleId);
  const { questions } = useTemplateQuestions(templateId);

  if (isLoading) {
    return <div>Cargando respuestas...</div>;
  }

  if (!responses || responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay respuestas disponibles para este template.
      </div>
    );
  }

  const handleGeneratePDF = async (clientResponses: any[]) => {
    try {
      // Group responses by client
      const responsesByClient = clientResponses.reduce((acc, response) => {
        if (!acc[response.question_id]) {
          acc[response.question_id] = response.response_value;
        }
        return acc;
      }, {});

      // Get client and sale data
      const client = clientResponses[0]?.clients;
      const saleData = clientResponses[0]?.sale_id ? {
        sale_date: new Date().toISOString(),
        total_amount: 0,
      } : null;

      // Create template context
      const context = createTemplateContext(client, null, null, saleData, responsesByClient);

      // Generate document content
      const template = { content: { responses: responsesByClient } };
      const documentContent = generateDocumentWithResponses(template, context, responsesByClient);

      // Download PDF
      await downloadPDF(documentContent, `cuestionario-${client?.first_name || 'cliente'}-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Group responses by client
  const responsesByClient = responses.reduce((acc: any, response: any) => {
    const clientId = response.client_id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: response.clients,
        responses: [],
      };
    }
    acc[clientId].responses.push(response);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Respuestas del Cuestionario</h3>
          <p className="text-sm text-muted-foreground">
            Total de respuestas: {Object.keys(responsesByClient).length}
          </p>
        </div>
      </div>

      {/* Individual Client Responses */}
      {Object.entries(responsesByClient).map(([clientId, data]: [string, any]) => (
        <Card key={clientId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {data.client ? `${data.client.first_name} ${data.client.last_name}` : 'Cliente desconocido'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {data.client?.email} • {data.responses.length} respuestas
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGeneratePDF(data.responses)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.responses.map((response: any) => {
                const question = questions.find(q => q.id === response.question_id);
                return (
                  <div key={response.id} className="border-l-2 border-primary/20 pl-4">
                    <h4 className="font-medium text-sm">
                      {question?.question_text || 'Pregunta no encontrada'}
                    </h4>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs mr-2">
                        {question?.question_type || 'unknown'}
                      </Badge>
                      <span className="text-sm">{response.response_value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Respondido el {new Date(response.created_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Response Statistics */}
      {responseStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estadísticas de Respuestas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(responseStats).map(([questionId, stats]: [string, any]) => {
                const question = questions.find(q => q.id === questionId);
                return (
                  <div key={questionId} className="border rounded p-3">
                    <h4 className="font-medium text-sm mb-2">
                      {question?.question_text || 'Pregunta no encontrada'}
                    </h4>
                    <div className="text-xs text-muted-foreground mb-2">
                      Total de respuestas: {stats.total}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(stats.responses).map(([value, count]: [string, any]) => (
                        <div key={value} className="flex justify-between items-center text-sm">
                          <span>{value}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};