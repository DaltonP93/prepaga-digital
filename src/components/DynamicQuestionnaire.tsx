
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
  saleId: string;
  signatureToken?: string;
  onComplete?: (responses: Record<string, any>) => void;
  readOnly?: boolean;
}

export const DynamicQuestionnaire = ({ 
  templateId, 
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
      if (!saleId || !templateId) return;

      try {
        const { data, error } = await supabase
          .from("template_responses")
          .select("question_id, response_value")
          .eq("template_id", templateId)
          .eq("sale_id", saleId);

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
  }, [saleId, templateId, form]);

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
        sale_id: saleId,
        response_value: typeof value === "object" ? JSON.stringify(value) : String(value),
      }));

      // Delete existing responses first
      await supabase
        .from("template_responses")
        .delete()
        .eq("template_id", templateId)
        .eq("sale_id", saleId);

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
                  <RadioGroupItem value={option.option_value || ''} id={option.id} />
                  <Label htmlFor={option.id}>{option.option_text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === "select_multiple" && (
            <div className="space-y-2">
              {question.template_question_options?.map((option) => {
                const selectedValues = Array.isArray(currentValue) ? currentValue : [];
                const isChecked = selectedValues.includes(option.option_value);
                
                return (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={isChecked}
                      disabled={readOnly}
                      onCheckedChange={(checked) => {
                        let newValues = [...selectedValues];
                        if (checked) {
                          newValues.push(option.option_value);
                        } else {
                          newValues = newValues.filter(v => v !== option.option_value);
                        }
                        handleResponseChange(question.id, newValues);
                      }}
                    />
                    <Label htmlFor={option.id}>{option.option_text}</Label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando cuestionario...</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay preguntas configuradas para este cuestionario.
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
        {questions.map((question, index) => renderQuestion(question, index))}
        
        {!readOnly && (
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? "Guardando..." : "Completar Cuestionario"}
            </Button>
          </div>
        )}
      </div>
    </Form>
  );
};
