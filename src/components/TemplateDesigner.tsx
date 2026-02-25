import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TipTapEditor from "@/components/TipTapEditor";
import { DraggablePlaceholdersSidebar } from "@/components/DraggablePlaceholdersSidebar";
import { Eye, FileText } from "lucide-react";
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
  onAttachmentClick?: () => void;
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

  const handleVariableSelect = (variable: string) => {
    const variablePlaceholder = `{{${variable}}}`;
    const newContent = templateData.content + " " + variablePlaceholder;
    handleContentChange(newContent);
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
