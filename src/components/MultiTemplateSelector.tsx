
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertCircle } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  template_type?: string;
  active: boolean;
}

interface MultiTemplateSelectorProps {
  selectedTemplates: string[];
  onSelectionChange: (templateIds: string[]) => void;
}

export const MultiTemplateSelector: React.FC<MultiTemplateSelectorProps> = ({
  selectedTemplates,
  onSelectionChange,
}) => {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-for-selection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        active: t.is_active ?? true
      })) as Template[];
    },
  });

  const handleTemplateToggle = (templateId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTemplates, templateId]);
    } else {
      onSelectionChange(selectedTemplates.filter(id => id !== templateId));
    }
  };

  const getTemplateTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      'contrato': 'Contrato',
      'declaracion_jurada': 'Declaración Jurada',
      'certificado': 'Certificado',
      'formulario': 'Formulario',
    };
    return types[type || ''] || type || 'Documento';
  };

  const getTemplateTypeColor = (type?: string) => {
    const colors: Record<string, string> = {
      'contrato': 'bg-blue-100 text-blue-800',
      'declaracion_jurada': 'bg-green-100 text-green-800',
      'certificado': 'bg-purple-100 text-purple-800',
      'formulario': 'bg-orange-100 text-orange-800',
    };
    return colors[type || ''] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Selección de Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Cargando templates...</div>
        </CardContent>
      </Card>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Selección de Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>No hay templates disponibles</p>
            <p className="text-sm">Crea templates primero para poder seleccionarlos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Selección de Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecciona uno o más templates para esta venta. Puedes combinar diferentes tipos de documentos.
        </p>
        {selectedTemplates.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{selectedTemplates.length} template(s) seleccionado(s)</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`template-${template.id}`}
                      checked={selectedTemplates.includes(template.id)}
                      onCheckedChange={(checked) => handleTemplateToggle(template.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <label 
                          htmlFor={`template-${template.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {template.name}
                        </label>
                        <Badge 
                          variant="secondary" 
                          className={getTemplateTypeColor(template.template_type)}
                        >
                          {getTemplateTypeLabel(template.template_type)}
                        </Badge>
                      </div>
                      
                      {template.description && (
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        {selectedTemplates.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Templates Seleccionados:</p>
            <div className="flex flex-wrap gap-1">
              {selectedTemplates.map((templateId) => {
                const template = templates.find(t => t.id === templateId);
                return template ? (
                  <Badge key={templateId} variant="default" className="text-xs">
                    {template.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
