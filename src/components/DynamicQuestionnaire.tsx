import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTemplateQuestions } from "@/hooks/useTemplateQuestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type TemplateQuestion = Tables<"template_questions"> & {
  template_question_options: Tables<"template_question_options">[];
};

interface DynamicQuestionnaireProps {
  templateId: string;
  clientId: string;
  saleId?: string;
  signatureToken?: string;
  onComplete?: (responses: Record<string, any>) => void;
  readOnly?: boolean;
}

export const DynamicQuestionnaire = ({ 
  templateId, 
  clientId, 
  saleId, 
  signatureToken,
  onComplete, 
  readOnly = false 
}: DynamicQuestionnaireProps) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { questions, isLoading } = useTemplateQuestions(templateId);

  const form = useForm({
    defaultValues: responses,
  });

  // Load existing responses if any
  useEffect(() => {
    const loadExistingResponses = async () => {
      if (!clientId || !templateId) return;

      try {
        const { data, error } = await supabase
          .from("template_responses")
          .select("question_id, response_value")
          .eq("template_id", templateId)
          .eq("client_id", clientId);

        if (error) throw error;

        const existingResponses: Record<string, any> = {};
        data?.forEach((response) => {
          existingResponses[response.question_id] = response.response_value;
        });

        setResponses(existingResponses);
        form.reset(existingResponses);
      } catch (error) {
        console.error("Error loading existing responses:", error);
      }
    };

    loadExistingResponses();
  }, [clientId, templateId, form]);

  const handleResponseChange = (questionId: string, value: any) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);
    form.setValue(questionId, value);
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    
    setIsSubmitting(true);
    try {
      // Validate required questions
      const requiredQuestions = questions.filter(q => q.is_required);
      const missingResponses = requiredQuestions.filter(q => !responses[q.id] || responses[q.id] === "");
      
      if (missingResponses.length > 0) {
        toast.error(`Por favor complete las siguientes preguntas obligatorias: ${missingResponses.map(q => q.question_text).join(", ")}`);
        setIsSubmitting(false);
        return;
      }

      // Save responses to database
      const responseData = Object.entries(responses).map(([questionId, value]) => ({
        template_id: templateId,
        question_id: questionId,
        client_id: clientId,
        sale_id: saleId,
        response_value: typeof value === "object" ? JSON.stringify(value) : String(value),
      }));

      // Delete existing responses first
      await supabase
        .from("template_responses")
        .delete()
        .eq("template_id", templateId)
        .eq("client_id", clientId);

      // Insert new responses
      const { error } = await supabase
        .from("template_responses")
        .insert(responseData);

      if (error) throw error;

      toast.success("Cuestionario completado exitosamente");
      
      // Redirect to signature page if we have the token
      if (signatureToken) {
        window.location.href = `/signature/${signatureToken}`;
      } else {
        onComplete?.(responses);
      }
    } catch (error: any) {
      console.error("Error saving responses:", error);
      toast.error(error.message || "Error al guardar las respuestas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: TemplateQuestion, index: number) => {
    const questionNumber = index + 1;
    const currentValue = responses[question.id] || "";

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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {question.question_type === "yes_no" && (
            <RadioGroup
              value={currentValue}
              onValueChange={(value) => handleResponseChange(question.id, value)}
              disabled={readOnly}
            >
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
              value={currentValue}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              placeholder="Ingrese su respuesta aquí..."
              disabled={readOnly}
              className="resize-none"
            />
          )}

          {question.question_type === "number" && (
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              placeholder="Ingrese un número"
              disabled={readOnly}
            />
          )}

          {question.question_type === "select_single" && (
            <RadioGroup
              value={currentValue}
              onValueChange={(value) => handleResponseChange(question.id, value)}
              disabled={readOnly}
            >
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
                  <Checkbox
                    id={option.id}
                    checked={Array.isArray(currentValue) ? currentValue.includes(option.option_value) : false}
                    onCheckedChange={(checked) => {
                      let newValue = Array.isArray(currentValue) ? [...currentValue] : [];
                      if (checked) {
                        newValue.push(option.option_value);
                      } else {
                        newValue = newValue.filter(v => v !== option.option_value);
                      }
                      handleResponseChange(question.id, newValue);
                    }}
                    disabled={readOnly}
                  />
                  <Label htmlFor={option.id}>{option.option_text}</Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div>Cargando cuestionario...</div>;
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay preguntas disponibles para este template.
      </div>
    );
  }

  const activeQuestions = questions;

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Cuestionario</h3>
        <p className="text-sm text-muted-foreground">
          Por favor complete todas las preguntas marcadas como obligatorias
        </p>
      </div>

      {activeQuestions.map((question, index) => renderQuestion(question, index))}

      {!readOnly && (
        <div className="flex justify-center pt-6 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? "Guardando..." : "Completar Cuestionario"}
          </Button>
        </div>
      )}

      <div className="text-center pt-4 text-sm text-muted-foreground">
        Total de preguntas: {activeQuestions.length} | 
        Completadas: {Object.keys(responses).filter(key => responses[key] && responses[key] !== "").length}
      </div>
    </div>
  );
};
