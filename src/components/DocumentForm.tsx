import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocuments } from "@/hooks/useDocuments";
import { useTemplates } from "@/hooks/useTemplates";
import { usePlans } from "@/hooks/usePlans";
import { Plus, Edit } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { FileUpload } from "@/components/FileUpload";

const documentSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  document_type: z.string().optional(),
  content: z.string().optional(),
  file_url: z.string().optional(),
  template_id: z.string().optional(),
  plan_id: z.string().optional(),
  is_required: z.boolean().default(true),
  order_index: z.number().min(0).default(0),
});

type DocumentFormData = z.infer<typeof documentSchema>;
type Document = Tables<"documents">;

interface DocumentFormProps {
  document?: Document;
  trigger?: React.ReactNode;
}

export const DocumentForm = ({ document, trigger }: DocumentFormProps) => {
  const [open, setOpen] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const { createDocument, updateDocument, isCreating, isUpdating } = useDocuments();
  const { templates } = useTemplates();
  const { data: plans } = usePlans();

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: document?.name || "",
      document_type: document?.document_type || "",
      content: document?.content || "",
      file_url: document?.file_url || "",
      template_id: document?.template_id || "",
      plan_id: document?.plan_id || "",
      is_required: document?.is_required ?? true,
      order_index: document?.order_index || 0,
    },
  });

  const handleFileUploadComplete = (url: string) => {
    setUploadedFileUrl(url);
    form.setValue("file_url", url);
  };

  const onSubmit = (data: DocumentFormData) => {
    const finalData = {
      ...data,
      file_url: uploadedFileUrl || data.file_url || null,
    };

    if (document) {
      updateDocument({
        id: document.id,
        updates: {
          name: finalData.name,
          document_type: finalData.document_type || null,
          content: finalData.content || null,
          file_url: finalData.file_url,
          template_id: finalData.template_id || null,
          plan_id: finalData.plan_id || null,
          is_required: finalData.is_required,
          order_index: finalData.order_index,
        },
      });
    } else {
      createDocument({
        name: finalData.name,
        document_type: finalData.document_type || null,
        content: finalData.content || null,
        file_url: finalData.file_url,
        template_id: finalData.template_id || null,
        plan_id: finalData.plan_id || null,
        is_required: finalData.is_required,
        order_index: finalData.order_index,
      });
    }
    
    setOpen(false);
    setUploadedFileUrl(null);
    form.reset();
  };

  const defaultTrigger = document ? (
    <Button variant="ghost" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Nuevo Documento
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document ? "Editar Documento" : "Crear Nuevo Documento"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre del documento" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="PDF, Formulario, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sin template</SelectItem>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__all__">Todos los planes</SelectItem>
                        {plans?.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Archivo del Documento</FormLabel>
              <FileUpload
                bucket="documents"
                accept=".pdf,.doc,.docx,.txt"
                maxSize={10}
                onUploadComplete={handleFileUploadComplete}
              />
              {(uploadedFileUrl || form.getValues("file_url")) && (
                <p className="text-sm text-green-600">
                  ✓ Archivo cargado: {uploadedFileUrl || form.getValues("file_url")}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido del Template</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Contenido del documento con variables como {{cliente.nombre}}..."
                      className="min-h-32"
                    />
                  </FormControl>
                  <FormDescription>
                    Usa variables como {{cliente.nombre}}, {{plan.precio}}, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Orden de aparición del documento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Obligatorio</FormLabel>
                      <FormDescription>
                        Este documento es requerido
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
                {document ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
