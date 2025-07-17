import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { TipTapEditor } from "@/components/TipTapEditor";
import { DocumentPreview } from "@/components/DocumentPreview";
import { useTemplates } from "@/hooks/useTemplates";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { QuestionnairePreview } from "@/components/QuestionnairePreview";
import { VisualTemplateEditor } from "@/components/VisualTemplateEditor";
import { Plus, Edit } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { WorkflowManager } from "@/components/WorkflowManager";
import { CollaborationPanel } from "@/components/CollaborationPanel";
import { VersionControlPanel } from "@/components/VersionControlPanel";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { useTemplateAnalytics } from "@/hooks/useTemplateAnalytics";

const templateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  content: z.string().optional(),
  template_type: z.enum(["contract", "declaration", "questionnaire", "other"]).default("questionnaire"),
  static_content: z.string().optional(),
  dynamic_fields: z.array(z.any()).default([]),
  is_global: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;
type Template = Tables<"templates">;

interface TemplateFormProps {
  template?: Template;
  trigger?: React.ReactNode;
}

export const TemplateForm = ({ template, trigger }: TemplateFormProps) => {
  const [open, setOpen] = useState(false);
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useTemplates();
  const { trackEvent } = useTemplateAnalytics(template?.id);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      content: template?.content ? JSON.stringify(template.content, null, 2) : "",
      template_type: (template?.template_type as any) || "questionnaire",
      static_content: template?.static_content || "",
      dynamic_fields: Array.isArray(template?.dynamic_fields) ? template.dynamic_fields : [],
      is_global: template?.is_global || false,
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    try {
      let contentData = {};
      
      // Si es questionnaire y hay content, parsearlo como JSON
      if (data.template_type === "questionnaire" && data.content) {
        contentData = JSON.parse(data.content);
      }
      
      const templateData = {
        name: data.name,
        description: data.description,
        template_type: data.template_type,
        content: contentData,
        static_content: data.static_content,
        dynamic_fields: data.dynamic_fields,
        is_global: data.is_global,
      };

      if (template) {
        updateTemplate({ id: template.id, updates: templateData });
        trackEvent?.('template_updated');
      } else {
        createTemplate(templateData);
      }
      
      setOpen(false);
      form.reset();
    } catch (error) {
      form.setError("content", {
        type: "manual",
        message: "El contenido JSON no es válido",
      });
    }
  };

  const defaultTrigger = template ? (
    <Button variant="ghost" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Nuevo Template
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Crear Nuevo Template"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <Tabs defaultValue="info" className="h-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="questions" disabled={!template}>Preguntas</TabsTrigger>
              <TabsTrigger value="workflow" disabled={!template}>Workflow</TabsTrigger>
              <TabsTrigger value="collaboration" disabled={!template}>Colaboración</TabsTrigger>
              <TabsTrigger value="versions" disabled={!template}>Versiones</TabsTrigger>
              <TabsTrigger value="analytics" disabled={!template}>Analytics</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <TabsContent value="info" className="space-y-4 mt-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del template" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Descripción del template" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="template_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Template</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el tipo de template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="contract">Contrato</SelectItem>
                            <SelectItem value="declaration">Declaración Jurada</SelectItem>
                            <SelectItem value="questionnaire">Cuestionario</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define el tipo de documento que representa este template
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_global"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Template Global</FormLabel>
                          <FormDescription>
                            Los templates globales están disponibles para todas las empresas
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

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || isUpdating}
                    >
                      {template ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="editor" className="mt-4 h-full">
                {form.watch("template_type") === "questionnaire" ? (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contenido del Cuestionario (JSON)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder='{"title": "Mi Cuestionario", "questions": [...]}'
                              rows={15}
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormDescription>
                            Define la estructura del cuestionario en formato JSON
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <TipTapEditor
                    content={form.watch("static_content") || ""}
                    onContentChange={(content) => form.setValue("static_content", content)}
                    dynamicFields={form.watch("dynamic_fields") || []}
                    onDynamicFieldsChange={(fields) => form.setValue("dynamic_fields", fields)}
                  />
                )}
              </TabsContent>

              <TabsContent value="questions" className="mt-4">
                {template && <QuestionBuilder templateId={template.id} />}
              </TabsContent>

              <TabsContent value="workflow" className="mt-4">
                {template && <WorkflowManager templateId={template.id} />}
              </TabsContent>

              <TabsContent value="collaboration" className="mt-4">
                {template && <CollaborationPanel templateId={template.id} />}
              </TabsContent>

              <TabsContent value="versions" className="mt-4">
                {template && <VersionControlPanel templateId={template.id} />}
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                {template && <AnalyticsDashboard templateId={template.id} />}
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                {form.watch("template_type") === "questionnaire" ? (
                  template && <QuestionnairePreview templateId={template.id} />
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-medium">Vista Previa en Tiempo Real</p>
                      <p className="text-xs text-blue-600 mt-1">Esta vista se actualiza automáticamente mientras editas</p>
                    </div>
                    <DocumentPreview
                      content={form.watch("static_content") || ""}
                      dynamicFields={form.watch("dynamic_fields") || []}
                      templateType={form.watch("template_type") || "document"}
                      templateName={form.watch("name") || "documento"}
                    />
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
