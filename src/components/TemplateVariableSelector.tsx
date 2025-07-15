
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Variable {
  name: string;
  description: string;
  example: string;
}

interface CustomField {
  name: string;
  value: string;
}

interface TemplateVariableSelectorProps {
  onVariableSelect: (variable: string) => void;
  customFields: CustomField[];
  onCustomFieldAdd: (field: CustomField) => void;
  onCustomFieldRemove: (index: number) => void;
}

const defaultVariables: Variable[] = [
  { name: "{{cliente.nombre}}", description: "Nombre del cliente", example: "Juan Pérez" },
  { name: "{{cliente.email}}", description: "Email del cliente", example: "juan@email.com" },
  { name: "{{cliente.telefono}}", description: "Teléfono del cliente", example: "+54 11 1234-5678" },
  { name: "{{cliente.dni}}", description: "DNI/CI del cliente", example: "12345678" },
  { name: "{{cliente.direccion}}", description: "Dirección del cliente", example: "Av. Corrientes 1234" },
  { name: "{{plan.nombre}}", description: "Nombre del plan", example: "Plan Premium" },
  { name: "{{plan.precio}}", description: "Precio del plan", example: "$199.99" },
  { name: "{{plan.descripcion}}", description: "Descripción del plan", example: "Cobertura completa..." },
  { name: "{{empresa.nombre}}", description: "Nombre de la empresa", example: "MediCorp SA" },
  { name: "{{empresa.direccion}}", description: "Dirección de la empresa", example: "Centro 123" },
  { name: "{{empresa.telefono}}", description: "Teléfono de la empresa", example: "+54 11 5555-1234" },
  { name: "{{venta.fecha}}", description: "Fecha de la venta", example: "15/07/2024" },
  { name: "{{venta.total}}", description: "Total de la venta", example: "$199.99" },
  { name: "{{venta.vendedor}}", description: "Nombre del vendedor", example: "María García" },
  { name: "{{fecha.hoy}}", description: "Fecha actual", example: "15/07/2024" },
  { name: "{{firma.fecha}}", description: "Fecha de firma", example: "16/07/2024" },
];

export function TemplateVariableSelector({ 
  onVariableSelect, 
  customFields, 
  onCustomFieldAdd, 
  onCustomFieldRemove 
}: TemplateVariableSelectorProps) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Variable ${variable} copiada`);
    onVariableSelect(variable);
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim() || !newFieldValue.trim()) return;
    
    onCustomFieldAdd({
      name: newFieldName.trim(),
      value: newFieldValue.trim()
    });
    
    setNewFieldName("");
    setNewFieldValue("");
    toast.success("Campo personalizado agregado");
  };

  return (
    <div className="space-y-6">
      {/* Variables Predefinidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variables Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 max-h-64 overflow-y-auto">
            {defaultVariables.map((variable, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {variable.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {variable.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: {variable.example}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyVariable(variable.name)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campos Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campos Personalizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar nuevo campo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="field-name">Nombre del Campo</Label>
              <Input
                id="field-name"
                placeholder="ej: numeroContrato"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="field-value">Valor por Defecto</Label>
              <Input
                id="field-value"
                placeholder="ej: {{custom.numeroContrato}}"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddCustomField} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Lista de campos personalizados */}
          {customFields.length > 0 && (
            <div className="space-y-2">
              <Label>Campos Agregados:</Label>
              {customFields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {field.value}
                    </Badge>
                    <span className="text-sm">{field.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyVariable(field.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCustomFieldRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
