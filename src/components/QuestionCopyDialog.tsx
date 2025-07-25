
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface QuestionCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTemplateId: string;
}

interface TemplateQuestion {
  id: string;
  question: string;
  type: string;
  options: any;
  required: boolean;
  order_index: number;
  template_id: string;
}

export function QuestionCopyDialog({ open, onOpenChange, targetTemplateId }: QuestionCopyDialogProps) {
  const [sourceTemplateId, setSourceTemplateId] = useState<string>("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Obtener templates disponibles
  const { data: templates = [] } = useQuery({
    queryKey: ['templates-for-copy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name')
        .neq('id', targetTemplateId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Obtener preguntas del template origen
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['template-questions', sourceTemplateId],
    queryFn: async () => {
      if (!sourceTemplateId) return [];
      
      const { data, error } = await supabase
        .from('template_questions')
        .select('*')
        .eq('template_id', sourceTemplateId)
        .order('order_index');

      if (error) throw error;
      return data as TemplateQuestion[];
    },
    enabled: !!sourceTemplateId,
  });

  // Mutación para copiar preguntas
  const copyQuestions = useMutation({
    mutationFn: async (questionIds: string[]) => {
      if (!questionIds.length) {
        throw new Error('Selecciona al menos una pregunta');
      }

      // Obtener las preguntas seleccionadas
      const { data: questionsData, error: fetchError } = await supabase
        .from('template_questions')
        .select('*')
        .in('id', questionIds);

      if (fetchError) throw fetchError;

      // Obtener el siguiente order_index para el template destino
      const { data: maxOrder } = await supabase
        .from('template_questions')
        .select('order_index')
        .eq('template_id', targetTemplateId)
        .order('order_index', { ascending: false })
        .limit(1);

      let nextOrderIndex = 1;
      if (maxOrder && maxOrder.length > 0) {
        nextOrderIndex = maxOrder[0].order_index + 1;
      }

      // Preparar las preguntas para insertar
      const questionsToInsert = questionsData.map((question, index) => ({
        template_id: targetTemplateId,
        question: question.question,
        type: question.type,
        options: question.options,
        required: question.required,
        order_index: nextOrderIndex + index,
      }));

      // Insertar las preguntas
      const { error: insertError } = await supabase
        .from('template_questions')
        .insert(questionsToInsert);

      if (insertError) throw insertError;

      return questionsToInsert;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-questions', targetTemplateId] });
      toast.success(`${data.length} pregunta(s) copiada(s) exitosamente`);
      onOpenChange(false);
      setSourceTemplateId("");
      setSelectedQuestions([]);
    },
    onError: (error: any) => {
      toast.error('Error al copiar preguntas: ' + error.message);
    },
  });

  const handleQuestionToggle = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestions(prev => [...prev, questionId]);
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleCopy = () => {
    copyQuestions.mutate(selectedQuestions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copiar Preguntas de Otro Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Seleccionar Template Origen</Label>
            <Select value={sourceTemplateId} onValueChange={setSourceTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceTemplateId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Preguntas Disponibles</Label>
                {questions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedQuestions.length === questions.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm">
                      Seleccionar todas ({questions.length})
                    </Label>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Cargando preguntas...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Este template no tiene preguntas disponibles.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-60 border rounded-md p-3">
                  <div className="space-y-3">
                    {questions.map((question) => (
                      <div key={question.id} className="flex items-start space-x-3 p-3 border rounded-md">
                        <Checkbox
                          id={question.id}
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={(checked) => handleQuestionToggle(question.id, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label 
                            htmlFor={question.id} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {question.question}
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-secondary px-2 py-1 rounded">
                              {question.type}
                            </span>
                            {question.required && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Requerida
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {selectedQuestions.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <Check className="inline h-4 w-4 mr-1" />
                    {selectedQuestions.length} pregunta(s) seleccionada(s)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={copyQuestions.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCopy}
            disabled={!sourceTemplateId || selectedQuestions.length === 0 || copyQuestions.isPending}
          >
            {copyQuestions.isPending ? 'Copiando...' : `Copiar ${selectedQuestions.length} Pregunta(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
