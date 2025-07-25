
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { TipTapEditor } from '@/components/TipTapEditor';
import { DocumentPreview } from '@/components/DocumentPreview';
import { useTemplates } from '@/hooks/useTemplates';
import { QuestionBuilder } from '@/components/QuestionBuilder';
import { TemplateVariableSelector } from '@/components/TemplateVariableSelector';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface TemplateFormData {
  name: string;
  description: string;
  type: 'documento' | 'declaracion_jurada' | 'contrato';
  category: string;
  content: string;
  active: boolean;
  requires_signature: boolean;
  has_questions: boolean;
  dynamic_fields: any[];
}

interface TemplateFormProps {
  templateId?: string;
  onClose: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ templateId, onClose }) => {
  const { createTemplate, updateTemplate, getTemplate } = useTemplates();
  const [content, setContent] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedType, setSelectedType] = useState<'documento' | 'declaracion_jurada' | 'contrato'>('documento');
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [hasQuestions, setHasQuestions] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<TemplateFormData>({
    defaultValues: {
      name: '',
      description: '',
      type: 'documento',
      category: '',
      content: '',
      active: true,
      requires_signature: false,
      has_questions: false,
      dynamic_fields: []
    }
  });

  const watchedType = watch('type');
  const watchedName = watch('name');
  const watchedCategory = watch('category');

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  // Auto-enable options when type changes
  useEffect(() => {
    if (watchedType === 'declaracion_jurada' || watchedType === 'contrato') {
      setRequiresSignature(true);
      setHasQuestions(true);
      setValue('requires_signature', true);
      setValue('has_questions', true);
      
      // Switch to questions tab
      setActiveTab('questions');
    }
    setSelectedType(watchedType);
  }, [watchedType, setValue]);

  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      const template = await getTemplate(templateId);
      if (template) {
        reset({
          name: template.name || '',
          description: template.description || '',
          type: template.type || 'documento',
          category: template.category || '',
          content: template.content || '',
          active: template.active !== false,
          requires_signature: template.requires_signature || false,
          has_questions: template.has_questions || false,
          dynamic_fields: template.dynamic_fields || []
        });
        
        setContent(template.content || '');
        setDynamicFields(template.dynamic_fields || []);
        setRequiresSignature(template.requires_signature || false);
        setHasQuestions(template.has_questions || false);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar el template');
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const templateData = {
        ...data,
        name: data.name || '',
        content,
        dynamic_fields: dynamicFields,
        requires_signature: requiresSignature,
        has_questions: hasQuestions
      };

      if (templateId) {
        await updateTemplate(templateId, templateData);
        toast.success('Template actualizado exitosamente');
      } else {
        await createTemplate(templateData);
        toast.success('Template creado exitosamente');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar el template');
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setValue('content', newContent);
  };

  const handleAddVariable = (variable: any) => {
    setDynamicFields([...dynamicFields, variable]);
  };

  const handleRemoveVariable = (index: number) => {
    const newFields = dynamicFields.filter((_, i) => i !== index);
    setDynamicFields(newFields);
  };

  const handleQuestionsChange = (newQuestions: any[]) => {
    setQuestions(newQuestions);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{templateId ? 'Editar Template' : 'Crear Nuevo Template'}</CardTitle>
          <CardDescription>
            Configure los detalles del template y su contenido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="content">Contenido</TabsTrigger>
                <TabsTrigger value="questions">Preguntas</TabsTrigger>
                <TabsTrigger value="preview">Vista Previa</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Template</Label>
                    <Input
                      id="name"
                      {...register('name', { required: 'El nombre es requerido' })}
                      placeholder="Ingrese el nombre del template"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Categoría</Label>
                    <Input
                      id="category"
                      {...register('category')}
                      placeholder="Ej: Contratos, Documentos legales"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe el propósito y uso del template"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Tipo de Template</Label>
                  <RadioGroup
                    value={watchedType}
                    onValueChange={(value) => setValue('type', value as any)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="documento" id="documento" />
                      <Label htmlFor="documento">Documento</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="declaracion_jurada" id="declaracion_jurada" />
                      <Label htmlFor="declaracion_jurada">Declaración Jurada</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="contrato" id="contrato" />
                      <Label htmlFor="contrato">Contrato</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={watch('active')}
                      onCheckedChange={(checked) => setValue('active', checked)}
                    />
                    <Label htmlFor="active">Activo</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_signature"
                      checked={requiresSignature}
                      onCheckedChange={(checked) => {
                        setRequiresSignature(checked);
                        setValue('requires_signature', checked);
                      }}
                    />
                    <Label htmlFor="requires_signature">Requiere Firma</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_questions"
                      checked={hasQuestions}
                      onCheckedChange={(checked) => {
                        setHasQuestions(checked);
                        setValue('has_questions', checked);
                      }}
                    />
                    <Label htmlFor="has_questions">Tiene Preguntas</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div>
                  <Label>Contenido del Template</Label>
                  <div className="mt-2 border rounded-lg">
                    <TipTapEditor
                      content={content}
                      onUpdate={handleContentChange}
                      placeholder="Escriba el contenido de su template aquí..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Variables Dinámicas</Label>
                  <div className="mt-2">
                    <TemplateVariableSelector onAddVariable={handleAddVariable} />
                  </div>
                  
                  {dynamicFields.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>Variables Agregadas:</Label>
                      <div className="flex flex-wrap gap-2">
                        {dynamicFields.map((field, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {field.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVariable(index)}
                              className="h-auto p-0 ml-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="questions" className="space-y-4">
                <QuestionBuilder
                  questions={questions}
                  onChange={handleQuestionsChange}
                  templateType={selectedType}
                />
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <DocumentPreview
                  content={content}
                  variables={dynamicFields}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {templateId ? 'Actualizar' : 'Crear'} Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
