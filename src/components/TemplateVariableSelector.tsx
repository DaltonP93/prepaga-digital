
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { getAvailableVariables } from '@/lib/templateEngine';
import { useTemplate } from '@/hooks/useTemplates';

interface TemplateVariableSelectorProps {
  onVariableSelect: (variable: any) => void;
  customFields: any[];
  onCustomFieldAdd: (field: any) => void;
  onCustomFieldRemove: (index: number) => void;
  templateId?: string;
}

export function TemplateVariableSelector({ 
  onVariableSelect, 
  customFields, 
  onCustomFieldAdd, 
  onCustomFieldRemove,
  templateId 
}: TemplateVariableSelectorProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const { data: templateData } = useTemplate(templateId);

  const defaultVariables = getAvailableVariables();

  const handleAddCustomField = () => {
    if (newFieldName && newFieldLabel) {
      onCustomFieldAdd({
        key: newFieldName,
        label: newFieldLabel,
        type: 'text'
      });
      setNewFieldName('');
      setNewFieldLabel('');
    }
  };

  const handleVariableClick = (variable: string) => {
    onVariableSelect({ key: variable });
  };

  // Generar variables de preguntas del template
  const questionVariables = templateData?.template_questions?.map((question: any) => ({
    key: `respuestas.${question.id}`,
    label: question.question_text,
    type: 'question'
  })) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Variables del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 gap-1">
            {defaultVariables.map((variable) => (
              <Button
                key={variable}
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handleVariableClick(variable)}
              >
                {variable}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {questionVariables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Variables de Preguntas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 gap-1">
              {questionVariables.map((question) => (
                <Button
                  key={question.key}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-8"
                  onClick={() => handleVariableClick(`{{${question.key}}}`)}
                >
                  <Badge variant="secondary" className="mr-2 text-xs">
                    Pregunta
                  </Badge>
                  {question.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Campos Personalizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="fieldName" className="text-xs">Nombre del campo</Label>
              <Input
                id="fieldName"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="nombre_campo"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="fieldLabel" className="text-xs">Etiqueta</Label>
              <Input
                id="fieldLabel"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Etiqueta del campo"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            onClick={handleAddCustomField}
            size="sm"
            className="w-full h-8 text-xs"
            disabled={!newFieldName || !newFieldLabel}
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar Campo
          </Button>

          {customFields.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                {customFields.map((field, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onVariableSelect(field)}
                    >
                      {`{{${field.key}}}`}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onCustomFieldRemove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
