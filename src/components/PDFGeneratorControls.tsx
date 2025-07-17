import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Eye, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

interface PDFGeneratorControlsProps {
  content: string;
  dynamicFields: any[];
  templateType: string;
  templateName?: string;
  clientData?: any;
  disabled?: boolean;
}

export const PDFGeneratorControls: React.FC<PDFGeneratorControlsProps> = ({
  content,
  dynamicFields,
  templateType,
  templateName = 'documento',
  clientData = {},
  disabled = false,
}) => {
  const { 
    isGenerating, 
    progress, 
    error, 
    downloadPDF, 
    previewPDF, 
    reset 
  } = usePDFGeneration();

  const generateOptions = {
    htmlContent: content,
    filename: `${templateName}_${new Date().toISOString().split('T')[0]}`,
    documentType: templateType as any,
    dynamicFields,
    clientData,
    templateData: { name: templateName },
  };

  const handleDownload = async () => {
    const success = await downloadPDF(generateOptions);
    if (success) {
      console.log('PDF downloaded successfully');
    }
  };

  const handlePreview = async () => {
    const success = await previewPDF(generateOptions);
    if (success) {
      console.log('PDF preview opened');
    }
  };

  const canGenerate = content && content.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generador de PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            ) : error ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : canGenerate ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">
              {isGenerating 
                ? 'Generando PDF...' 
                : error 
                ? 'Error' 
                : canGenerate 
                ? 'Listo para generar' 
                : 'Contenido requerido'
              }
            </span>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline">{dynamicFields.length} campos</Badge>
            <Badge variant="secondary">{templateType}</Badge>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {progress}% completado
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reintentar
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handlePreview}
            disabled={disabled || !canGenerate || isGenerating}
            variant="outline"
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa
          </Button>
          
          <Button
            onClick={handleDownload}
            disabled={disabled || !canGenerate || isGenerating}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• La vista previa abre el PDF en una nueva ventana</p>
          <p>• Los campos dinámicos se reemplazan con datos de ejemplo</p>
          <p>• El PDF se optimiza para impresión en formato A4</p>
        </div>
      </CardContent>
    </Card>
  );
};