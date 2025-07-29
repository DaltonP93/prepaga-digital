
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TipTapEditor } from "@/components/TipTapEditor";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { DocumentPreview } from "@/components/DocumentPreview";
import { QuestionCopyDialog } from "@/components/QuestionCopyDialog";
import { FileText, Settings, Eye, HelpCircle, Copy } from "lucide-react";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/useTemplates";
import { useTemplateQuestions } from "@/hooks/useTemplateQuestions";
import { Database } from "@/integrations/supabase/types";

type Template = Database['public']['Tables']['templates']['Row'];

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
}

interface TemplateFormData {
  name: string;
  description: string;
  content: string;
  active: boolean;
  is_global: boolean;
}

export function TemplateForm({ open, onOpenChange, template }: TemplateFormProps) {
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const isEditing = !!template;
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);

  const { questions, isLoading: questionsLoading } = useTemplateQuestions(template?.id);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TemplateFormData>({
    defaultValues: {
      name: "",
      description: "",
      content: "",
      active: true,
      is_global: false,
    }
  });

  // Actualizar formulario cuando cambia el template
  useEffect(() => {
    if (template && open) {
      console.log('Loading template data:', template);
      setValue("name", template.name || "");
      setValue("description", template.description || "");
      setValue("content", typeof template.content === 'string' ? template.content : (template.content ? JSON.stringify(template.content) : ""));
      setValue("active", template.active ?? true);
      setValue("is_global", template.is_global ?? false);
      
      // Load dynamic fields if they exist
      if (template.dynamic_fields && Array.isArray(template.dynamic_fields)) {
        setDynamicFields(template.dynamic_fields);
      }
    } else if (!template) {
      reset({
        name: "",
        description: "",
        content: "",
        active: true,
        is_global: false,
      });
      setDynamicFields([]);
      setCustomFields([]);
    }
  }, [template, setValue, reset, open]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const templateData = {
        ...data,
        dynamic_fields: dynamicFields,
      };

      if (isEditing && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          ...templateData,
        });
      } else {
        await createTemplate.mutateAsync(templateData);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleContentChange = (newContent: string) => {
    setValue("content", newContent);
  };

  const handleDynamicFieldsChange = (fields: any[]) => {
    setDynamicFields(fields);
  };

  const handleCustomFieldAdd = (field: any) => {
    setCustomFields(prev => [...prev, field]);
  };

  const handleCustomFieldRemove = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditing ? "Editar Template" : "Nuevo Template"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contenido
                </TabsTrigger>
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Preguntas
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista Previa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Template</Label>
                      <Input
                        id="name"
                        {...register("name", { required: "El nombre es requerido" })}
                      />
                      {errors.name && (
                        <span className="text-sm text-red-500">{errors.name.message}</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        {...register("description")}
                        placeholder="Describe el propósito de este template..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Template Activo</Label>
                        <p className="text-sm text-muted-foreground">
                          Los templates inactivos no aparecerán en las listas de selección
                        </p>
                      </div>
                      <Switch
                        checked={watch("active")}
                        onCheckedChange={(checked) => setValue("active", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Template Global</Label>
                        <p className="text-sm text-muted-foreground">
                          Los templates globales están disponibles para todas las empresas
                        </p>
                      </div>
                      <Switch
                        checked={watch("is_global")}
                        onCheckedChange={(checked) => setValue("is_global", checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Editor de Contenido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TipTapEditor
                      content={watch("content")}
                      onContentChange={handleContentChange}
                      dynamicFields={dynamicFields}
                      onDynamicFieldsChange={handleDynamicFieldsChange}
                      templateQuestions={questions || []}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="questions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Preguntas del Template</CardTitle>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCopyDialog(true)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar Preguntas
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <QuestionBuilder
                        templateId={template.id}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Guarda el template primero para poder agregar preguntas
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Vista Previa del Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentPreview
                      content={watch("content")}
                      dynamicFields={dynamicFields}
                      templateType="contract"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                {(createTemplate.isPending || updateTemplate.isPending) ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEditing && template && (
        <QuestionCopyDialog
          open={showCopyDialog}
          onOpenChange={setShowCopyDialog}
          targetTemplateId={template.id}
        />
      )}
    </>
  );
}
