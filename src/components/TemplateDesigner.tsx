import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocuSealForm } from "@/components/DocuSealForm";
import TipTapEditor from "@/components/TipTapEditor";
import { TemplateVariables } from "@/components/TemplateVariables";
import { DraggablePlaceholdersSidebar } from "@/components/DraggablePlaceholdersSidebar";
import { Save, Eye, FileText, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';

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
}) => {
  const { toast } = useToast();
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

  const handleDocuSealCompleted = (data: any) => {
    toast({
      title: "Documento completado en DocuSeal",
      description: "El documento ha sido procesado exitosamente.",
    });
    console.log("DocuSeal completion data:", data);
  };

  const handleVariableSelect = (variable: string) => {
    const variablePlaceholder = `{{${variable}}}`;
    const newContent = templateData.content + " " + variablePlaceholder;
    handleContentChange(newContent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {template ? "Editar Template" : "Nuevo Template"}
          </h2>
          <p className="text-muted-foreground">
            Diseña y personaliza tu template de documento
          </p>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Template Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-name">Nombre del Template</Label>
              <Input
                id="template-name"
                value={templateData.name}
                onChange={(e) =>
                  setTemplateData(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nombre del template"
              />
            </div>
            <div>
              <Label htmlFor="template-type">Tipo de Template</Label>
              <Input
                id="template-type"
                value={templateData.template_type}
                onChange={(e) =>
                  setTemplateData(prev => ({ ...prev, template_type: e.target.value }))
                }
                placeholder="Tipo de template"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="template-description">Descripción</Label>
            <Textarea
              id="template-description"
              value={templateData.description}
              onChange={(e) =>
                setTemplateData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descripción del template"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Design Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Editor de Contenido
          </TabsTrigger>
          <TabsTrigger value="docuseal" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            DocuSeal
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista Previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with placeholders */}
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
              <Card>
                <CardHeader>
                  <CardTitle>Contenido del Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <TipTapEditor
                    content={templateData.content}
                    onChange={handleContentChange}
                    dynamicFields={dynamicFields}
                    onDynamicFieldsChange={onDynamicFieldsChange}
                    templateQuestions={templateQuestions}
                    templateId={templateId}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Template Variables */}
          <TemplateVariables 
            onVariableSelect={handleVariableSelect}
          />
        </TabsContent>

        <TabsContent value="docuseal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>DocuSeal - Diseño de Firma Digital</CardTitle>
              <p className="text-muted-foreground">
                Utiliza DocuSeal para crear documentos con campos de firma digital
              </p>
            </CardHeader>
            <CardContent>
              <DocuSealForm
                src="https://docuseal.com/d/LEVGR9rhZYf86M"
                email="dalton.perez+test@saa.com.py"
                onCompleted={handleDocuSealCompleted}
                className="w-full min-h-[600px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Template</CardTitle>
            </CardHeader>
            <CardContent>
              {/* SECURITY: Content is sanitized with DOMPurify to prevent XSS attacks */}
              <div 
                className="prose max-w-none p-6 border rounded-lg bg-white"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(templateData.content) }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
