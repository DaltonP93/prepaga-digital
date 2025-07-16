import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Type, Calendar, Hash, ToggleLeft } from "lucide-react";
import { useTemplatePlaceholders } from "@/hooks/useTemplatePlaceholders";

interface ContractEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  dynamicFields: any[];
  onDynamicFieldsChange: (fields: any[]) => void;
}

export const ContractEditor: React.FC<ContractEditorProps> = ({
  content,
  onContentChange,
  dynamicFields,
  onDynamicFieldsChange,
}) => {
  const { placeholders } = useTemplatePlaceholders();
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>("");

  const insertPlaceholder = (placeholderName: string) => {
    const placeholder = placeholders?.find(p => p.placeholder_name === placeholderName);
    if (!placeholder) return;

    const placeholderText = `{${placeholderName}}`;
    const newContent = content + placeholderText;
    onContentChange(newContent);

    // Agregar a campos dinámicos si no existe
    const existingField = dynamicFields.find(f => f.name === placeholderName);
    if (!existingField) {
      const newFields = [...dynamicFields, {
        name: placeholderName,
        label: placeholder.placeholder_label,
        type: placeholder.placeholder_type,
        defaultValue: placeholder.default_value || "",
        required: true
      }];
      onDynamicFieldsChange(newFields);
    }
  };

  const getPlaceholderIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const removeDynamicField = (fieldName: string) => {
    const newFields = dynamicFields.filter(f => f.name !== fieldName);
    onDynamicFieldsChange(newFields);
    
    // Remover del contenido también
    const regex = new RegExp(`\\{${fieldName}\\}`, 'g');
    const newContent = content.replace(regex, '');
    onContentChange(newContent);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor Principal */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contenido del Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Escriba el contenido del contrato o declaración jurada aquí. Use {NOMBRE_PLACEHOLDER} para insertar campos dinámicos."
              rows={20}
              className="min-h-[500px] resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* Panel Lateral */}
      <div className="space-y-4">
        {/* Placeholders Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {placeholders?.map((placeholder) => (
              <Button
                key={placeholder.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => insertPlaceholder(placeholder.placeholder_name)}
              >
                <div className="flex items-center gap-2">
                  {getPlaceholderIcon(placeholder.placeholder_type)}
                  <span className="truncate">{placeholder.placeholder_label}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Campos Dinámicos Insertados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos Insertados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dynamicFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay campos insertados. Haga clic en los campos disponibles para agregarlos.
              </p>
            ) : (
              dynamicFields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    {getPlaceholderIcon(field.type)}
                    <div>
                      <div className="text-sm font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {`{${field.name}}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDynamicField(field.name)}
                  >
                    ×
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Vista Previa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista Previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Campos dinámicos:</strong> {dynamicFields.length}</p>
              <p><strong>Caracteres:</strong> {content.length}</p>
              <p><strong>Líneas:</strong> {content.split('\n').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};