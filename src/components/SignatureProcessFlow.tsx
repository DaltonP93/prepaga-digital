
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Send, FileSignature, Download } from 'lucide-react';

interface SignatureProcessFlowProps {
  currentStep: number;
  isProcessing: boolean;
  status?: string;
}

const steps = [
  { id: 1, name: 'Guardando firma', icon: FileSignature },
  { id: 2, name: 'Obteniendo cuestionario', icon: Send },
  { id: 3, name: 'Generando documento', icon: FileSignature },
  { id: 4, name: 'Creando PDF', icon: Download },
  { id: 5, name: 'Guardando documento', icon: CheckCircle },
  { id: 6, name: 'Finalizando', icon: CheckCircle },
];

export const SignatureProcessFlow: React.FC<SignatureProcessFlowProps> = ({
  currentStep,
  isProcessing,
  status
}) => {
  const progressPercentage = isProcessing ? (currentStep / steps.length) * 100 : 0;

  if (status === 'firmado' || status === 'completado') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Proceso Completado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Badge className="bg-green-100 text-green-800">
              ✅ Documento firmado exitosamente
            </Badge>
            <p className="text-sm text-muted-foreground">
              El documento ha sido firmado y guardado correctamente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isProcessing && currentStep === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Procesando Firma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso del proceso</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>

          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isPending = currentStep < step.id;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isCompleted
                      ? 'bg-green-50 text-green-700'
                      : isCurrent
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-100'
                        : isCurrent
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{step.name}</span>
                  {isCurrent && isProcessing && (
                    <div className="ml-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignatureProcessFlow;
