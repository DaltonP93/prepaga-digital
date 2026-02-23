import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TemplateDesigner } from "@/components/TemplateDesigner";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { QuestionCopyDialog } from "@/components/QuestionCopyDialog";
import { EnhancedPlaceholdersPanel } from "@/components/templates/EnhancedPlaceholdersPanel";
import { LiveTemplatePreview } from "@/components/templates/LiveTemplatePreview";
import { TemplateAnnexesManager } from "@/components/templates/TemplateAnnexesManager";
import { FileText, Settings, Eye, HelpCircle, Copy, Code, Sparkles, ChevronLeft, ChevronRight, Wand2, Paperclip } from "lucide-react";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/useTemplates";
import { useTemplateQuestions } from "@/hooks/useTemplateQuestions";
import { useEnhancedPDFGeneration } from "@/hooks/useEnhancedPDFGeneration";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Template = Database["public"]["Tables"]["templates"]["Row"];

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  mode?: "dialog" | "inline";
}

interface TemplateFormData {
  name: string;
  description: string;
  content: string;
  active: boolean;
  is_global: boolean;
}

const TAB_ORDER = ["setup", "content", "variables", "questions", "preview"] as const;
type TabKey = (typeof TAB_ORDER)[number];

const QUICK_START_TEMPLATES = [
  {
    key: "ddjj",
    label: "DDJJ Salud",
    description: "Plantilla base para declaración jurada",
    content: `
<h1>DECLARACIÓN JURADA DE SALUD</h1>
<p>Yo, <strong>{{nombre_completo_cliente}}</strong>, con documento <strong>{{documento_cliente}}</strong>, declaro bajo juramento:</p>
<ul>
  <li>Que la información proporcionada es verídica.</li>
  <li>Que comprendo las condiciones del plan seleccionado.</li>
  <li>Que autorizo el procesamiento de mis datos para fines contractuales.</li>
</ul>
<p>Fecha: {{fecha_actual}}</p>
<p>Firma: __________________________</p>
`,
  },
  {
    key: "contrato",
    label: "Contrato Servicios",
    description: "Estructura profesional de contrato",
    content: `
<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>
<p>Entre <strong>{{empresa_nombre}}</strong> y <strong>{{nombre_completo_cliente}}</strong> se acuerda lo siguiente:</p>
<h3>1. Objeto</h3>
<p>La prestación del servicio correspondiente al plan <strong>{{plan_nombre}}</strong>.</p>
<h3>2. Condiciones económicas</h3>
<p>Monto pactado: <strong>{{monto_total}}</strong>.</p>
<h3>3. Vigencia</h3>
<p>Desde {{fecha_inicio}} hasta {{fecha_fin}}.</p>
<p>Firma Cliente: __________________________</p>
<p>Firma Empresa: __________________________</p>
`,
  },
  {
    key: "consentimiento",
    label: "Consentimiento",
    description: "Formato para consentimiento informado",
    content: `
<h1>CONSENTIMIENTO INFORMADO</h1>
<p>Yo, <strong>{{nombre_completo_cliente}}</strong>, declaro que:</p>
<ol>
  <li>Recibí información clara sobre el servicio contratado.</li>
  <li>Comprendí coberturas, límites y exclusiones.</li>
  <li>Acepto los términos y condiciones del plan.</li>
</ol>
<p>Fecha: {{fecha_actual}}</p>
<p>Firma: __________________________</p>
`,
  },
];

export function TemplateForm({ open, onOpenChange, template, mode = "dialog" }: TemplateFormProps) {
  const isInlineMode = mode === "inline";
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const isEditing = !!template;
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("setup");
  const [showAnnexes, setShowAnnexes] = useState(false);

  const { questions } = useTemplateQuestions(template?.id);
  const { downloadDocument, isGenerating } = useEnhancedPDFGeneration();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TemplateFormData>({
    defaultValues: {
      name: "",
      description: "",
      content: "",
      active: true,
      is_global: false,
    },
  });

  useEffect(() => {
    if (template && open) {
      setValue("name", template.name || "");
      setValue("description", template.description || "");
      setValue("content", typeof template.content === "string" ? template.content : template.content ? JSON.stringify(template.content) : "");
      setValue("active", template.is_active ?? true);
      setValue("is_global", false);
      setDynamicFields([]);
      setActiveTab("setup");
    } else if (!template && open) {
      reset({
        name: "",
        description: "",
        content: "",
        active: true,
        is_global: false,
      });
      setDynamicFields([]);
      setActiveTab("setup");
    }
  }, [template, setValue, reset, open]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user?.id || "")
        .single();

      const templateData = {
        name: data.name,
        description: data.description,
        content: data.content,
        is_active: data.active,
        company_id: profile?.company_id || "",
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

  const applyQuickStart = (content: string) => {
    if (watch("content")?.trim()) {
      const shouldReplace = window.confirm("¿Reemplazar el contenido actual con la plantilla base seleccionada?");
      if (!shouldReplace) return;
    }
    setValue("content", content, { shouldDirty: true });
    setActiveTab("content");
  };

  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const hasPrevTab = activeIndex > 0;
  const hasNextTab = activeIndex < TAB_ORDER.length - 1;

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-gradient-to-r from-background to-primary/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Asistente de diseño</p>
            <p className="text-xs text-muted-foreground">Flujo guiado para crear templates robustos en pocos pasos.</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Paso {activeIndex + 1} de {TAB_ORDER.length}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuración</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Diseñador</span>
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Variables</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Preguntas</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Vista previa</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>Define nombre, descripción y estado del template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Template</Label>
                  <Input id="name" {...register("name", { required: "El nombre es requerido" })} />
                  {errors.name && <span className="text-sm text-destructive">{errors.name.message}</span>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" {...register("description")} placeholder="Describe el propósito de este template..." />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Template Activo</Label>
                    <p className="text-sm text-muted-foreground">Los templates inactivos no aparecerán en selección.</p>
                  </div>
                  <Switch checked={watch("active")} onCheckedChange={(checked) => setValue("active", checked)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Arranque Rápido</CardTitle>
                <CardDescription>Comienza con una estructura profesional predefinida.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {QUICK_START_TEMPLATES.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyQuickStart(preset.content)}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card className="h-[620px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Diseñador Visual</CardTitle>
                  <CardDescription>Construye el documento principal con formato profesional.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing && template && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAnnexes(!showAnnexes)}>
                      <Paperclip className="h-4 w-4 mr-2" />
                      Anexos
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("variables")}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Insertar variables
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[540px]">
              <TemplateDesigner
                template={template}
                content={watch("content")}
                onContentChange={handleContentChange}
                dynamicFields={dynamicFields}
                onDynamicFieldsChange={handleDynamicFieldsChange}
                templateQuestions={questions || []}
                templateId={template?.id}
                onAttachmentClick={isEditing && template ? () => setShowAnnexes(true) : undefined}
              />
            </CardContent>
          </Card>
          {showAnnexes && isEditing && template && (
            <TemplateAnnexesManager templateId={template.id} />
          )}
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <EnhancedPlaceholdersPanel
            onPlaceholderInsert={(placeholder) => {
              const currentContent = watch("content");
              setValue("content", `${currentContent} ${placeholder}`.trim());
            }}
          />
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preguntas del Template</CardTitle>
                  <CardDescription>Configura las preguntas dinámicas del proceso de firma.</CardDescription>
                </div>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={() => setShowCopyDialog(true)} className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar Preguntas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <QuestionBuilder templateId={template.id} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Guarda el template primero para poder agregar preguntas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="preview" className="space-y-4">
          <LiveTemplatePreview
            templateId={template?.id}
            content={watch("content")}
            onDownloadPDF={() => {
              downloadDocument({
                htmlContent: watch("content"),
                filename: watch("name") || "template",
                documentType: "contract",
              });
            }}
            isGeneratingPDF={isGenerating}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!hasPrevTab}
            onClick={() => setActiveTab(TAB_ORDER[Math.max(activeIndex - 1, 0)])}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasNextTab}
            onClick={() => setActiveTab(TAB_ORDER[Math.min(activeIndex + 1, TAB_ORDER.length - 1)])}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
            {createTemplate.isPending || updateTemplate.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <>
      {isInlineMode ? (
        formContent
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent 
            className="max-w-7xl max-h-[95vh] overflow-y-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {isEditing ? "Editor Profesional de Template" : "Nuevo Template Profesional"}
              </DialogTitle>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      )}

      {isEditing && template && (
        <QuestionCopyDialog open={showCopyDialog} onOpenChange={setShowCopyDialog} targetTemplateId={template.id} />
      )}
    </>
  );
}

