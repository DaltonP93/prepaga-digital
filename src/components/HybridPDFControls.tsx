
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Eye, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  Cloud,
  Settings
} from 'lucide-react';
import { useHybridPDFGeneration } from '@/hooks/useHybridPDFGeneration';
import { PDFData } from '@/lib/pdfUtils';

interface HybridPDFControlsProps extends PDFData {
  filename: string;
  saleId?: string;
  disabled?: boolean;
}

export const HybridPDFControls: React.FC<HybridPDFControlsProps> = ({
  personal,
  health,
  plan,
  signature,
  filename,
  saleId,
  disabled = false,
}) => {
  const [mode, setMode] = useState<'auto' | 'client' | 'server'>('auto');
  
  const { 
    isGenerating, 
    progress, 
    error, 
    mode: currentMode,
    downloadPDF, 
    previewPDF, 
    reset,
    isSimpleDocument
  } = useHybridPDFGeneration();

  const pdfData: PDFData = { personal, health, plan, signature };
  const isSimple = isSimpleDocument(pdfData);

  const generateOptions = {
    ...pdfData,
    filename,
    saleId,
    forceMode: mode === 'auto' ? undefined : mode,
  };

  const handleDownload = async () => {
    await downloadPDF(generateOptions);
  };

  const handlePreview = async () => {
    await previewPDF(generateOptions);
  };

  const canGenerate = personal.first_name && personal.last_name && personal.email && personal.dni;

  const getModeIcon = (modeType: string) => {
    switch (modeType) {
      case 'client': return <Zap className="w-4 h-4" />;
      case 'server': return <Cloud className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getRecommendedMode = () => {
    if (mode === 'auto') {
      return isSimple ? 'client' : 'server';
    }
    return mode;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generador de PDF Híbrido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de Modo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Modo de Generación</label>
          <Select value={mode} onValueChange={(value: any) => setMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Automático (Recomendado)
                </div>
              </SelectItem>
              <SelectItem value="client">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Cliente - Rápido
                </div>
              </SelectItem>
              <SelectItem value="server">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Servidor - Completo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado y Análisis */}
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
                ? `Generando PDF (${currentMode})...` 
                : error 
                ? 'Error' 
                : canGenerate 
                ? 'Listo para generar' 
                : 'Datos incompletos'
              }
            </span>
          </div>
          
          <div className="flex gap-2">
            <Badge variant={isSimple ? "default" : "secondary"}>
              {isSimple ? 'Simple' : 'Complejo'}
            </Badge>
            <Badge variant="outline">
              {Object.keys(health).length} respuestas
            </Badge>
          </div>
        </div>

        {/* Información del Modo */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            {getModeIcon(getRecommendedMode())}
            <span className="font-medium">
              Usará modo: {getRecommendedMode() === 'client' ? 'Cliente (Rápido)' : 'Servidor (Completo)'}
            </span>
          </div>
          <p className="text-muted-foreground">
            {getRecommendedMode() === 'client' 
              ? `Generación rápida en tu navegador (~2-3 segundos). Ideal para documentos simples.`
              : `Generación completa en servidor (~5-8 segundos). Calidad profesional garantizada.`
            }
          </p>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {progress}% completado - Estimado: {currentMode === 'client' ? '2-3s' : '5-8s'} restantes
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

        {/* Info Adicional */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Modo automático selecciona la mejor opción según complejidad</p>
          <p>• PDFs simples se generan instantáneamente en tu navegador</p>
          <p>• PDFs complejos incluyen diseño profesional y firma digital</p>
          <p>• Todos los documentos se optimizan para impresión A4</p>
        </div>
      </CardContent>
    </Card>
  );
};
