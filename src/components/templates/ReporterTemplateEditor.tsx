import { useEffect, useMemo, useRef, useState } from "react";
import mammoth from "mammoth";
import { renderAsync } from "docx-preview";
import {
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileType2,
  ScanText,
} from "lucide-react";
import { TemplateDesigner } from "@/components/TemplateDesigner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReporterTemplateEditorProps {
  templateId?: string;
  templateName?: string;
  content: string;
  onContentChange: (content: string) => void;
  dynamicFields: any[];
  onDynamicFieldsChange: (fields: any[]) => void;
  templateQuestions?: any[];
  onAttachmentClick?: () => string | void | Promise<string | void>;
}

const VARIABLE_REGEX = /\{\{[^}]+\}\}/g;

export function ReporterTemplateEditor({
  templateId,
  templateName,
  content,
  onContentChange,
  dynamicFields,
  onDynamicFieldsChange,
  templateQuestions = [],
  onAttachmentClick,
}: ReporterTemplateEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wordPreviewRef = useRef<HTMLDivElement | null>(null);
  const wordStyleRef = useRef<HTMLDivElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [lastFileName, setLastFileName] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [docxPreviewReady, setDocxPreviewReady] = useState(false);
  const [docxPreviewError, setDocxPreviewError] = useState<string>("");
  const [activeWorkspace, setActiveWorkspace] = useState<string>("word");

  const quickVariables = useMemo(
    () => [
      "{{nombre_completo_cliente}}",
      "{{documento_cliente}}",
      "{{email_cliente}}",
      "{{telefono_cliente}}",
      "{{empresa_nombre}}",
      "{{plan_nombre}}",
      "{{monto_total}}",
      "{{fecha_actual}}",
    ],
    [],
  );

  useEffect(() => {
    if (!docxBuffer || !wordPreviewRef.current) {
      return;
    }

    let cancelled = false;
    const previewContainer = wordPreviewRef.current;
    const styleContainer = wordStyleRef.current ?? previewContainer;

    const renderDocumentPreview = async () => {
      setIsRenderingPreview(true);
      setDocxPreviewReady(false);
      setDocxPreviewError("");
      previewContainer.innerHTML = "";
      if (styleContainer !== previewContainer) {
        styleContainer.innerHTML = "";
      }

      try {
        await renderAsync(docxBuffer.slice(0), previewContainer, styleContainer, {
          className: "reporter-docx",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          ignoreLastRenderedPageBreak: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
        });

        if (!cancelled) {
          setDocxPreviewReady(true);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Error rendering reporter docx preview:", error);
          setDocxPreviewError(error?.message || "No se pudo renderizar la vista fiel del Word.");
        }
      } finally {
        if (!cancelled) {
          setIsRenderingPreview(false);
        }
      }
    };

    void renderDocumentPreview();

    return () => {
      cancelled = true;
    };
  }, [docxBuffer]);

  const importDocx = async (file: File) => {
    setIsImporting(true);
    setMessages([]);
    setDocxPreviewError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          includeDefaultStyleMap: true,
          convertImage: mammoth.images.dataUri,
        },
      );

      const html = result.value?.trim();
      if (!html) {
        throw new Error("El Word no produjo contenido editable.");
      }

      const variables = [...new Set(html.match(VARIABLE_REGEX) || [])];
      setDetectedVariables(variables);
      setMessages(result.messages.map((message) => message.message));
      setLastFileName(file.name);
      setDocxBuffer(arrayBuffer);
      setActiveWorkspace("word");
      onContentChange(html);

      toast.success(`Documento importado: ${file.name}`);
    } catch (error: any) {
      console.error("Error importing reporter docx:", error);
      toast.error(error?.message || "No se pudo importar el archivo .docx");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Reporteador solo admite archivos .docx");
      return;
    }

    await importDocx(file);
  };

  const appendVariable = (placeholder: string) => {
    const spacer = content && !content.endsWith(" ") ? " " : "";
    onContentChange(`${content}${spacer}${placeholder}`);
    setActiveWorkspace("template");
    toast.success(`Variable agregada: ${placeholder}`);
  };

  const hasImportedWord = !!docxBuffer;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-gradient-to-br from-background via-background to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Reporteador
              </CardTitle>
              <CardDescription>
                Importa un Word y úsalo como base visual real. La vista fiel respeta encabezado, pie, imágenes y tamaño de página; el editor sigue manejando variables y firma.
              </CardDescription>
            </div>
            <Badge variant="secondary">Word + Variables + Firma</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-dashed border-primary/40 bg-background/60 p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  {isImporting ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-primary" />}
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Subir Word base</p>
                  <p className="text-sm text-muted-foreground">
                    Usa un `.docx` con placeholders como <code>{"{{nombre_completo_cliente}}"}</code>.
                  </p>
                  {lastFileName && (
                    <p className="text-xs text-muted-foreground">
                      Último importado: <span className="font-medium text-foreground">{lastFileName}</span>
                    </p>
                  )}
                </div>
              </div>
            </button>

            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm font-medium">Variables rápidas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inserta campos del sistema sin reabrir el Word.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickVariables.map((variable) => (
                  <Button
                    key={variable}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full"
                    onClick={() => appendVariable(variable)}
                  >
                    {variable}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Qué sí conserva</AlertTitle>
              <AlertDescription>
                La vista Word conserva encabezado, pie, imágenes, anchos y saltos de página. El editor sigue siendo el que manda para variables y firmas del sistema.
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cómo usarlo bien</AlertTitle>
              <AlertDescription>
                1. Sube el Word. 2. Revisa la vista fiel. 3. Ajusta variables en el editor. 4. Agrega firmas con los botones del diseñador.
              </AlertDescription>
            </Alert>
          </div>

          {(detectedVariables.length > 0 || messages.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-medium">Variables detectadas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se encontraron {detectedVariables.length} placeholders en el archivo importado.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detectedVariables.map((variable) => (
                    <Badge key={variable} variant="outline">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-medium">Notas de importación</p>
                <ScrollArea className="mt-3 h-24 pr-2">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {messages.length > 0 ? messages.map((message, index) => <p key={`${message}-${index}`}>{message}</p>) : <p>Sin advertencias.</p>}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeWorkspace} onValueChange={setActiveWorkspace} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="word" className="flex items-center gap-2">
            <FileType2 className="h-4 w-4" />
            Vista Word fiel
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <ScanText className="h-4 w-4" />
            Editor template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="word" className="space-y-4">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Documento base</CardTitle>
                  <CardDescription>
                    Esta vista usa el render de Word y preserva encabezado, pie, imágenes y tamaño de hoja.
                  </CardDescription>
                </div>
                {hasImportedWord && docxPreviewReady && <Badge variant="outline">Fidelidad alta</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {!hasImportedWord ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/40 p-10 text-center text-sm text-muted-foreground">
                  Sube un `.docx` para ver el documento con su maquetación real.
                </div>
              ) : (
                <div className="space-y-3">
                  {(isRenderingPreview || docxPreviewError) && (
                    <Alert variant={docxPreviewError ? "destructive" : "default"}>
                      {docxPreviewError ? <AlertCircle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4 animate-spin" />}
                      <AlertTitle>{docxPreviewError ? "No se pudo renderizar el Word" : "Renderizando vista Word"}</AlertTitle>
                      <AlertDescription>
                        {docxPreviewError || "Preparando la vista fiel del documento. Esto puede tardar unos segundos si el Word trae muchas imágenes."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="hidden" ref={wordStyleRef} />
                  <div className="rounded-xl border border-border/60 bg-slate-900/60 p-4">
                    <ScrollArea className="h-[72vh] pr-4">
                      <div
                        ref={wordPreviewRef}
                        className={cn(
                          "reporter-word-preview min-h-[400px] rounded-lg bg-slate-800/40 p-4",
                          !docxPreviewReady && "opacity-80",
                        )}
                      />
                    </ScrollArea>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-4">
          <TemplateDesigner
            template={templateId ? ({ id: templateId, name: templateName || "" } as any) : null}
            content={content}
            onContentChange={onContentChange}
            dynamicFields={dynamicFields}
            onDynamicFieldsChange={onDynamicFieldsChange}
            templateQuestions={templateQuestions}
            templateId={templateId}
            onAttachmentClick={onAttachmentClick}
            helperMode="reporter"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
