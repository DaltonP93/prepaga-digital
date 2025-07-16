import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DocumentPreviewProps {
  content: string;
  dynamicFields: any[];
  templateType: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  content,
  dynamicFields,
  templateType,
}) => {
  // Generate sample data for placeholders
  const sampleData: Record<string, string> = {
    NOMBRE_CLIENTE: 'Juan Carlos',
    APELLIDO_CLIENTE: 'González',
    DNI_CI_CLIENTE: '2.123.456',
    EMAIL_CLIENTE: 'juan.gonzalez@email.com',
    TELEFONO_CLIENTE: '0981-123456',
    DOMICILIO_CLIENTE: 'Av. España 1234, Asunción',
    BARRIO_CLIENTE: 'Centro',
    ESTADO_CIVIL_CLIENTE: 'Casado',
    FECHA_NACIMIENTO_CLIENTE: '15/05/1985',
    FECHA_ACTUAL: new Date().toLocaleDateString('es-PY'),
    EMPRESA_NOMBRE: 'Aseguradora Ejemplo S.A.',
    PLAN_NOMBRE: 'Plan Salud Premium',
    PLAN_PRECIO: '850.000',
  };

  // Replace placeholders with sample data
  const processContent = (html: string) => {
    let processedHtml = html;
    
    // Replace dynamic placeholders
    dynamicFields.forEach(field => {
      const regex = new RegExp(`<span[^>]*data-placeholder="${field.name}"[^>]*>\\{${field.name}\\}</span>`, 'g');
      const value = sampleData[field.name] || `[${field.label}]`;
      processedHtml = processedHtml.replace(regex, `<span class="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">${value}</span>`);
    });
    
    // Replace signature fields
    processedHtml = processedHtml.replace(
      /<div[^>]*data-signature="true"[^>]*>.*?<\/div>/g,
      '<div class="border-2 border-solid border-green-500 bg-green-50 p-4 text-center rounded-lg my-4 w-48 h-20"><p class="text-green-700 text-sm m-0 font-medium">✓ Firma Digital</p></div>'
    );
    
    return processedHtml;
  };

  const previewContent = processContent(content);
  const wordCount = content.replace(/<[^>]*>/g, '').split(' ').filter(word => word.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline">{templateType}</Badge>
        <Badge variant="secondary">{dynamicFields.length} campos dinámicos</Badge>
        <Badge variant="secondary">{wordCount} palabras</Badge>
      </div>

      {/* Preview Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa del Documento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta es una vista previa con datos de ejemplo. Los campos dinámicos aparecen resaltados en verde.
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-white border rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Field Summary */}
      {dynamicFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos Dinámicos Detectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dynamicFields.map((field) => (
                <div key={field.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{field.label}</div>
                    <div className="text-xs text-muted-foreground">{field.name}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{field.type}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {sampleData[field.name] || '[Ejemplo]'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de la Vista Previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Los campos dinámicos se muestran con <span className="bg-green-100 text-green-800 px-2 py-1 rounded">datos de ejemplo</span></p>
            <p>• Los campos de firma se representan como <span className="text-green-700 font-medium">✓ Firma Digital</span></p>
            <p>• Al generar el PDF real, estos campos se reemplazarán con los datos reales del cliente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};