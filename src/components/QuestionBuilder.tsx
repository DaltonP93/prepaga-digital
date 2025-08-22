
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, GripVertical, Edit } from "lucide-react";
import { useTemplateQuestions } from "@/hooks/useTemplateQuestions";
import { Tables } from "@/integrations/supabase/types";

const questionSchema = z.object({
  question_text: z.string().min(1, "El texto de la pregunta es obligatorio"),
  question_type: z.enum(["yes_no", "text", "number", "select_single", "select_multiple"]),
  is_required: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

const optionSchema = z.object({
  option_text: z.string().min(1, "El texto de la opción es obligatorio"),
  option_value: z.string().min(1, "El valor de la opción es obligatorio"),
});

type QuestionFormData = z.infer<typeof questionSchema>;
type OptionFormData = z.infer<typeof optionSchema>;
type TemplateQuestion = Tables<"template_questions"> & {
  template_question_options: Tables<"template_question_options">[];
};

interface QuestionBuilderProps {
  templateId: string;
}

const questionTypes = [
  { value: "yes_no", label: "Sí/No" },
  { value: "text", label: "Texto libre" },
  { value: "number", label: "Número" },
  { value: "select_single", label: "Selección única" },
  { value: "select_multiple", label: "Selección múltiple" },
];

export const QuestionBuilder = ({ templateId }: QuestionBuilderProps) => {
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [newOptions, setNewOptions] = useState<OptionFormData[]>([]);

  const {
    questions,
    isLoading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createOption,
    deleteOption,
    reorderQuestions,
  } = useTemplateQuestions(templateId);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_text: "",
      question_type: "yes_no",
      is_required: true,
      is_active: true,
    },
  });

  const optionForm = useForm<OptionFormData>({
    resolver: zodResolver(optionSchema),
    defaultValues: {
      option_text: "",
      option_value: "",
    },
  });

  const onSubmitQuestion = async (data: QuestionFormData) => {
    try {
      const questionData = {
        template_id: templateId,
        question_text: data.question_text,
        question_type: data.question_type,
        is_required: data.is_required,
        is_active: data.is_active,
        order_index: questions.length,
      };

      const createdQuestion = await createQuestion.mutateAsync(questionData);

      // Create options if it's a select type
      if ((data.question_type === "select_single" || data.question_type === "select_multiple") && newOptions.length > 0) {
        for (let i = 0; i < newOptions.length; i++) {
          await createOption.mutateAsync({
            question_id: createdQuestion.id,
            option_text: newOptions[i].option_text,
            option_value: newOptions[i].option_value,
            order_index: i,
          });
        }
      }

      form.reset();
      setNewOptions([]);
      setShowNewQuestionForm(false);
    } catch (error) {
      console.error("Error creating question:", error);
    }
  };

  const addOption = () => {
    const data = optionForm.getValues();
    if (data.option_text && data.option_value) {
      setNewOptions([...newOptions, data]);
      optionForm.reset();
    }
  };

  const removeOption = (index: number) => {
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion.mutateAsync(questionId);
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    return questionTypes.find(qt => qt.value === type)?.label || type;
  };

  if (isLoading) {
    return <div>Cargando preguntas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Existing Questions */}
      {questions.map((question: TemplateQuestion, index: number) => (
        <Card key={question.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <CardTitle className="text-base">{question.question_text}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getQuestionTypeLabel(question.question_type)}</Badge>
                <Badge variant={question.is_required ? "default" : "secondary"}>
                  {question.is_required ? "Obligatoria" : "Opcional"}
                </Badge>
                <Badge variant={question.is_active ? "default" : "secondary"}>
                  {question.is_active ? "Activa" : "Inactiva"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingQuestion(question.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {(question.question_type === "select_single" || question.question_type === "select_multiple") && (
            <CardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Opciones:</h4>
                {question.template_question_options?.map((option) => (
                  <div key={option.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>{option.option_text} ({option.option_value})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOption.mutateAsync(option.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* New Question Form */}
      {showNewQuestionForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Pregunta</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitQuestion)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="question_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto de la pregunta</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Ingrese el texto de la pregunta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="question_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de pregunta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo de pregunta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {questionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="is_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0">
                        <FormLabel>Obligatoria</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0">
                        <FormLabel>Activa</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Options for select types */}
                {(form.watch("question_type") === "select_single" || form.watch("question_type") === "select_multiple") && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Opciones</h4>
                    
                    {newOptions.map((option, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{option.option_text} ({option.option_value})</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Input
                        placeholder="Texto de la opción"
                        {...optionForm.register("option_text")}
                      />
                      <Input
                        placeholder="Valor"
                        {...optionForm.register("option_value")}
                      />
                      <Button type="button" onClick={addOption}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewQuestionForm(false);
                      form.reset();
                      setNewOptions([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Crear Pregunta</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowNewQuestionForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Pregunta
        </Button>
      )}
    </div>
  );
};
