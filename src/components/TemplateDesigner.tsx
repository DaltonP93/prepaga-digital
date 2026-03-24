import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TipTapEditor, { type TipTapEditorAPI } from "@/components/TipTapEditor";
import { DraggablePlaceholdersSidebar } from "@/components/DraggablePlaceholdersSidebar";
import { Eye, FileText, PenTool, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';
import { Button } from "@/components/ui/button";

interface TemplateDesignerProps {
  template?: any;
  content?: string;
  onContentChange?: (content: string) => void;
  dynamicFields?: any[];
  onDynamicFieldsChange?: (fields: any[]) => void;
  templateQuestions?: any[];
  templateId?: string;
  onSave?: (templateData: any) => void;
  onCancel?: () => void;
  onAttachmentClick?: () => void;
  helperMode?: "default" | "reporter";
}

export const TemplateDesigner: React.FC<TemplateDesignerProps> = ({
  template,
  content = "",
  onContentChange,
  dynamicFields = [],
  onDynamicFieldsChange,
  templateQuestions = [],
  templateId,
  onSave,
  onCancel,
  onAttachmentClick,
  helperMode = "default",
}) => {
  const { toast } = useToast();
  const editorApiRef = useRef<TipTapEditorAPI | null>(null);
  const [templateData, setTemplateData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    content: content || template?.content || "",
    template_type: template?.template_type || "document",
    is_active: template?.is_active !== false,
  });
  const [activeTab, setActiveTab] = useState("editor");

  useEffect(() => {
    if (content !== templateData.content) {
      setTemplateData(prev => ({ ...prev, content }));
    }
  }, [content]);

  const handleSave = () => {
    if (!templateData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del template es requerido.",
        variant: "destructive",
      });
      return;
    }

    if (onSave) {
      onSave(templateData);
    }

    toast({
      title: "Template guardado",
      description: "El template se ha guardado exitosamente.",
    });
  };

  const handleContentChange = (newContent: string) => {
    setTemplateData(prev => ({ ...prev, content: newContent }));
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const handlePlaceholderInsert = (placeholderName: string) => {
    const placeholder = `{{${placeholderName}}}`;
    const newContent = templateData.content + " " + placeholder;
    handleContentChange(newContent);
  };

  const handleQuestionInsert = (question: any) => {
    const questionPlaceholder = `{{question_${question.id}}}`;
    const newContent = templateData.content + " " + questionPlaceholder;
    handleContentChange(newContent);
  };

  const handleVariableSelect = (variable: string) => {
    const variablePlaceholder = `{{${variable}}}`;
    const newContent = templateData.content + " " + variablePlaceholder;
    handleContentChange(newContent);
  };

  const insertSignatureField = (label: string, signerRole: string) => {
    editorApiRef.current?.insertSignatureForRole(label, signerRole);
    toast({
      title: "Campo de firma agregado",
      description: `${label} fue agregado al documento.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Design Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Editor de Contenido
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista Previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {helperMode === "reporter" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Firma de documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Reporteador usa la misma firma del template normal. Agrega los campos con un clic y luego ubícalos dentro del documento.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => insertSignatureField("Firma del Contratante", "titular")}>
                    <PenTool className="mr-2 h-4 w-4" />
                    Firma contratante
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertSignatureField("Firma del Adherente", "adherente")}>
                    <User className="mr-2 h-4 w-4" />
                    Firma adherente
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertSignatureField("Firma de la Contratada", "contratada")}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Firma contratada
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar with placeholders - LEFT only */}
            <div className="lg:col-span-1">
              <DraggablePlaceholdersSidebar 
                onPlaceholderInsert={handlePlaceholderInsert}
                dynamicFields={dynamicFields}
                templateQuestions={templateQuestions}
                onQuestionInsert={handleQuestionInsert}
              />
            </div>

            {/* Main editor */}
            <div className="lg:col-span-3">
              <TipTapEditor
                ref={editorApiRef}
                content={templateData.content}
                onChange={handleContentChange}
                dynamicFields={dynamicFields}
                onDynamicFieldsChange={onDynamicFieldsChange}
                templateQuestions={templateQuestions}
                templateId={templateId}
                showSidebar={false}
                onAttachmentClick={onAttachmentClick}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose max-w-none p-6 border rounded-lg bg-background"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(templateData.content) }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
