import React, { useState } from "react";
import { useTemplates } from "@/hooks/useTemplates";
import { useSaleTemplates } from "@/hooks/useSaleTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface MultiTemplateSelectorProps {
  saleId: string;
  onTemplatesChange?: () => void;
}

export const MultiTemplateSelector: React.FC<MultiTemplateSelectorProps> = ({
  saleId,
  onTemplatesChange,
}) => {
  const { templates } = useTemplates();
  const { saleTemplates, addSaleTemplate, updateSaleTemplate, removeSaleTemplate } = useSaleTemplates(saleId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const availableTemplates = templates?.filter(
    template => !saleTemplates?.some(st => st.template_id === template.id)
  ) || [];

  const handleAddTemplate = () => {
    if (!selectedTemplateId) return;

    const template = templates?.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const maxOrder = Math.max(0, ...(saleTemplates?.map(st => st.order_index) || []));

    addSaleTemplate({
      sale_id: saleId,
      template_id: selectedTemplateId,
      document_type: (template as any).template_type || 'other',
      order_index: maxOrder + 1,
      status: 'pending'
    });

    setSelectedTemplateId("");
    onTemplatesChange?.();
  };

  const handleRemoveTemplate = (saleTemplateId: string) => {
    removeSaleTemplate(saleTemplateId);
    onTemplatesChange?.();
  };

  const handleOrderChange = (saleTemplateId: string, newOrder: number) => {
    updateSaleTemplate({
      id: saleTemplateId,
      updates: { order_index: newOrder }
    });
    onTemplatesChange?.();
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'Contrato';
      case 'declaration': return 'Declaración Jurada';
      case 'questionnaire': return 'Cuestionario';
      case 'other': return 'Otro';
      default: return 'Cuestionario';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'sent': return 'Enviado';
      case 'signed': return 'Firmado';
      case 'completed': return 'Completado';
      default: return 'Pendiente';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'sent': return 'default';
      case 'signed': return 'default';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Agregar Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Templates a la Venta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2"
            >
              <option value="">Seleccionar template...</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {getTemplateTypeLabel((template as any).template_type)}
                </option>
              ))}
            </select>
            <Button 
              onClick={handleAddTemplate} 
              disabled={!selectedTemplateId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Agregados */}
      <Card>
        <CardHeader>
          <CardTitle>Templates en la Venta</CardTitle>
        </CardHeader>
        <CardContent>
          {!saleTemplates || saleTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay templates agregados a esta venta
            </div>
          ) : (
            <div className="space-y-3">
              {saleTemplates
                .sort((a, b) => a.order_index - b.order_index)
                .map((saleTemplate, index) => (
                  <div
                    key={saleTemplate.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                      <span className="text-sm font-mono">{index + 1}</span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {(saleTemplate.template as any)?.name}
                        </h4>
                        <Badge variant="outline">
                          {getTemplateTypeLabel(saleTemplate.document_type)}
                        </Badge>
                        <Badge variant={getStatusVariant(saleTemplate.status) as any}>
                          {getStatusLabel(saleTemplate.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(saleTemplate.template as any)?.description || "Sin descripción"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`order-${saleTemplate.id}`} className="text-sm">
                        Orden:
                      </Label>
                      <Input
                        id={`order-${saleTemplate.id}`}
                        type="number"
                        min="1"
                        value={saleTemplate.order_index}
                        onChange={(e) => handleOrderChange(saleTemplate.id, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTemplate(saleTemplate.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};