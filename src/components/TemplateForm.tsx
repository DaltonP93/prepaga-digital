
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useTemplates } from "@/hooks/useTemplates";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { QuestionnairePreview } from "@/components/QuestionnairePreview";
import { VisualTemplateEditor } from "@/components/VisualTemplateEditor";
import { Plus, Edit } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

const templateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  content: z.string().min(1, "El contenido es obligatorio"),
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

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      content: template?.content ? JSON.stringify(template.content, null, 2) : "{}",
      is_global: template?.is_global || false,
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    try {
      const content = JSON.parse(data.content);
      
      if (template) {
        updateTemplate({
          id: template.id,
          updates: {
            name: data.name,
            description: data.description,
            content,
            is_global: data.is_global,
          },
        });
      } else {
        createTemplate({
          name: data.name,
          description: data.description,
          content,
          is_global: data.is_global,
        });
      }
      
      setOpen(false);
      form.reset();
    } catch (error) {
      form.setError("content", {
        type: "manual",
        message: "El contenido debe ser un JSON válido",
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
        
        <Tabs defaultValue="info" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Información Básica</TabsTrigger>
            <TabsTrigger value="visual">Editor Visual</TabsTrigger>
            <TabsTrigger value="questions" disabled={!template}>Preguntas</TabsTrigger>
            <TabsTrigger value="preview" disabled={!template}>Vista Previa</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <TabsContent value="info" className="space-y-4 mt-4">
              <Form {...form}>
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

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenido (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder='{"variables": [], "sections": []}'
                            className="min-h-32 font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription>
                          Define el contenido del template en formato JSON. 
                          Ejemplo: {`{"title": "{{cliente.nombre}}", "content": "Bienvenido {{cliente.nombre}}"}`}
                        </FormDescription>
                        <FormMessage />
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
              </Form>
            </TabsContent>

            <TabsContent value="visual" className="mt-4 h-full">
              <VisualTemplateEditor
                initialContent={template?.content}
                onSave={(content) => {
                  form.setValue('content', JSON.stringify(content));
                }}
              />
            </TabsContent>

            <TabsContent value="questions" className="mt-4">
              {template && <QuestionBuilder templateId={template.id} />}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {template && <QuestionnairePreview templateId={template.id} />}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
