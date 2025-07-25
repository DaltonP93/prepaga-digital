
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TipTapEditor } from "@/components/TipTapEditor";
import { DocumentPreview } from "@/components/DocumentPreview";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/useTemplates";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { QuestionnairePreview } from "@/components/QuestionnairePreview";
import { VisualTemplateEditor } from "@/components/VisualTemplateEditor";
import { useTemplateAnalytics } from "@/hooks/useTemplateAnalytics";

const templateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category: z.string().min(1, "La categoría es requerida"),
  type: z.enum(["documento", "declaracion_jurada", "contrato"], {
    required_error: "El tipo es requerido",
  }),
  content: z.string().min(1, "El contenido es requerido"),
  active: z.boolean().default(true),
  requires_signature: z.boolean().default(false),
  has_questions: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  template?: any;
  trigger?: React.ReactNode;
}

export const TemplateForm = ({ template, trigger }: TemplateFormProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const { trackEvent } = useTemplateAnalytics(template?.id);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      category: template?.category || "",
      type: template?.type || "documento",
      content: template?.content || "",
      active: template?.active ?? true,
      requires_signature: template?.requires_signature ?? false,
      has_questions: template?.has_questions ?? false,
    },
  });

  // Watch for type changes to automatically enable questions
  const watchedType = form.watch("type");

  useEffect(() => {
    // Automatically enable questions and switch to questions tab when type is declaracion_jurada or contrato
    if (watchedType === "declaracion_jurada" || watchedType === "contrato") {
      form.setValue("has_questions", true);
      form.setValue("requires_signature", true);
      setActiveTab("questions");
    } else {
      form.setValue("has_questions", false);
      form.setValue("requires_signature", false);
    }
  }, [watchedType, form]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const templateData = {
        ...data,
        content: data.content,
        dynamic_fields: [],
      };

      if (template) {
        updateTemplateMutation.mutate({ id: template.id, ...templateData });
        trackEvent?.('template_updated');
      } else {
        createTemplateMutation.mutate(templateData);
      }
      
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {template ? "Editar Template" : "Nuevo Template"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Crear Nuevo Template"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger 
                  value="questions" 
                  disabled={!form.watch("has_questions")}
                  className={form.watch("has_questions") ? "" : "opacity-50"}
                >
                  Preguntas
                  {form.watch("has_questions") && (
                    <Badge variant="secondary" className="ml-2">
                      Habilitado
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preview">Vista Previa</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Template</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Contrato de Servicios" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="financiero">Financiero</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe el propósito del template" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Template</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="documento" id="documento" />
                            <Label htmlFor="documento">Documento Simple</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="declaracion_jurada" id="declaracion_jurada" />
                            <Label htmlFor="declaracion_jurada">Declaración Jurada</Label>
                            <Badge variant="outline" className="ml-2">
                              Auto-habilita preguntas
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="contrato" id="contrato" />
                            <Label htmlFor="contrato">Contrato</Label>
                            <Badge variant="outline" className="ml-2">
                              Auto-habilita preguntas
                            </Badge>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-4">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Activo</FormLabel>
                          <FormDescription>
                            El template estará disponible para uso
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="editor">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido del Template</FormLabel>
                      <FormControl>
                        <div className="min-h-[400px]">
                          <TipTapEditor
                            content={field.value}
                            onChange={field.onChange}
                            placeholder="Escribe el contenido del template aquí..."
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="questions">
                {form.watch("has_questions") ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Configuración de Preguntas</h3>
                      <Badge variant="default">
                        Habilitado automáticamente para {form.watch("type").replace("_", " ")}
                      </Badge>
                    </div>
                    <QuestionBuilder templateId={template?.id} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Las preguntas se habilitan automáticamente cuando seleccionas "Declaración Jurada" o "Contrato"
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview">
                <div className="space-y-4">
                  <DocumentPreview 
                    content={form.watch("content")} 
                    templateData={{ 
                      name: form.watch("name"),
                      type: form.watch("type"),
                      category: form.watch("category")
                    }} 
                  />
                  {form.watch("has_questions") && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4">Vista Previa del Cuestionario</h3>
                      <QuestionnairePreview templateId={template?.id} />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {template ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
