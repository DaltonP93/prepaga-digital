
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
import { useTemplates, useCreateTemplate, useUpdateTemplate, useTemplate } from '@/hooks/useTemplates';
import { QuestionBuilder } from '@/components/QuestionBuilder';
import { TemplateVariableSelector } from '@/components/TemplateVariableSelector';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface TemplateFormData {
  name: string;
  description: string;
  template_type: 'contract' | 'declaration' | 'questionnaire' | 'other';
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
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: template } = useTemplate(templateId);
  const [content, setContent] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedType, setSelectedType] = useState<'contract' | 'declaration' | 'questionnaire' | 'other'>('questionnaire');
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [hasQuestions, setHasQuestions] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<TemplateFormData>({
    defaultValues: {
      name: '',
      description: '',
      template_type: 'questionnaire',
      category: '',
      content: '',
      active: true,
      requires_signature: false,
      has_questions: false,
      dynamic_fields: []
    }
  });

  const watchedType = watch('template_type');
  const watchedName = watch('name');
  const watchedCategory = watch('category');

  useEffect(() => {
    if (template) {
      reset({
        name: template.name || '',
        description: template.description || '',
        template_type: (template.template_type as 'contract' | 'declaration' | 'questionnaire' | 'other') || 'questionnaire',
        category: (template as any).category || '',
        content: (template.content as string) || '',
        active: template.active !== false,
        requires_signature: (template as any).requires_signature || false,
        has_questions: (template as any).has_questions || false,
        dynamic_fields: Array.isArray(template.dynamic_fields) ? template.dynamic_fields : []
      });
      
      setContent((template.content as string) || '');
      setDynamicFields(Array.isArray(template.dynamic_fields) ? template.dynamic_fields : []);
      setRequiresSignature((template as any).requires_signature || false);
      setHasQuestions((template as any).has_questions || false);
    }
  }, [template, reset]);

  // Auto-enable options when type changes
  useEffect(() => {
    if (watchedType === 'declaration' || watchedType === 'contract') {
      setRequiresSignature(true);
      setHasQuestions(true);
      setValue('requires_signature', true);
      setValue('has_questions', true);
      
      // Switch to questions tab
      setActiveTab('questions');
    }
    setSelectedType(watchedType);
  }, [watchedType, setValue]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const templateData = {
        name: data.name,
        description: data.description,
        template_type: data.template_type,
        category: data.category,
        content,
        active: data.active,
        requires_signature: requiresSignature,
        has_questions: hasQuestions,
        dynamic_fields: dynamicFields,
      };

      if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          ...templateData
        });
      } else {
        await createTemplate.mutateAsync(templateData);
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

  const handleCustomFieldAdd = (field: any) => {
    setCustomFields([...customFields, field]);
  };

  const handleCustomFieldRemove = (index: number) => {
    const newFields = customFields.filter((_, i) => i !== index);
    setCustomFields(newFields);
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
                    onValueChange={(value) => setValue('template_type', value as any)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="questionnaire" id="questionnaire" />
                      <Label htmlFor="questionnaire">Cuestionario</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="declaration" id="declaration" />
                      <Label htmlFor="declaration">Declaración Jurada</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="contract" id="contract" />
                      <Label htmlFor="contract">Contrato</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other">Otro</Label>
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
                      onContentChange={handleContentChange}
                      dynamicFields={dynamicFields}
                      onDynamicFieldsChange={setDynamicFields}
                    />
                  </div>
                </div>

                <div>
                  <Label>Variables Dinámicas</Label>
                  <div className="mt-2">
                    <TemplateVariableSelector
                      onVariableSelect={handleAddVariable}
                      customFields={customFields}
                      onCustomFieldAdd={handleCustomFieldAdd}
                      onCustomFieldRemove={handleCustomFieldRemove}
                    />
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
                  templateId={templateId}
                />
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <DocumentPreview
                  content={content}
                  dynamicFields={dynamicFields}
                  templateType={selectedType}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                {createTemplate.isPending || updateTemplate.isPending ? 'Guardando...' : (templateId ? 'Actualizar' : 'Crear')} Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
