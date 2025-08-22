
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTemplateQuestions } from "@/hooks/useTemplateQuestions";
import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

type TemplateQuestion = Tables<"template_questions"> & {
  template_question_options: Tables<"template_question_options">[];
};

interface QuestionnairePreviewProps {
  templateId: string;
}

export const QuestionnairePreview = ({ templateId }: QuestionnairePreviewProps) => {
  const { questions, isLoading, error } = useTemplateQuestions(templateId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cargando preguntas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error al cargar las preguntas: {error.message}
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay preguntas creadas para este template.
        <br />
        Agregue preguntas en la pestaña "Preguntas" para ver la vista previa.
      </div>
    );
  }

  const renderQuestion = (question: TemplateQuestion, index: number) => {
    const questionNumber = index + 1;

    return (
      <Card key={question.id} className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {questionNumber}. {question.question_text}
            </CardTitle>
            <div className="flex gap-2">
              {question.is_required && (
                <Badge variant="destructive" className="text-xs">
                  Obligatoria
                </Badge>
              )}
              {!question.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactiva
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {question.question_type === "yes_no" && (
            <RadioGroup disabled>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`}>Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`}>No</Label>
              </div>
            </RadioGroup>
          )}

          {question.question_type === "text" && (
            <Textarea
              placeholder="Ingrese su respuesta aquí..."
              disabled
              className="resize-none"
            />
          )}

          {question.question_type === "number" && (
            <Input
              type="number"
              placeholder="Ingrese un número"
              disabled
            />
          )}

          {question.question_type === "select_single" && (
            <RadioGroup disabled>
              {question.template_question_options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.option_value} id={option.id} />
                  <Label htmlFor={option.id}>{option.option_text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === "select_multiple" && (
            <div className="space-y-2">
              {question.template_question_options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox id={option.id} disabled />
                  <Label htmlFor={option.id}>{option.option_text}</Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Vista Previa del Cuestionario</h3>
        <p className="text-sm text-muted-foreground">
          Esta es una vista previa de cómo verán el cuestionario los clientes
        </p>
      </div>

      {questions.map((question, index) => renderQuestion(question, index))}

      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Total de preguntas: {questions.length} | 
          Obligatorias: {questions.filter(q => q.is_required).length} | 
          Activas: {questions.filter(q => q.is_active).length}
        </p>
      </div>
    </div>
  );
};
