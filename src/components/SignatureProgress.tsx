
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';

interface SignatureProgressProps {
  currentStep: number;
  isProcessing: boolean;
}

const steps = [
  { id: 0, title: 'Preparando', description: 'Iniciando proceso de firma' },
  { id: 1, title: 'Guardando Firma', description: 'Registrando la firma digital' },
  { id: 2, title: 'Procesando Respuestas', description: 'Obteniendo respuestas del cuestionario' },
  { id: 3, title: 'Generando Contenido', description: 'Preparando el documento final' },
  { id: 4, title: 'Creando PDF', description: 'Generando documento PDF' },
  { id: 5, title: 'Guardando Documento', description: 'Almacenando el contrato firmado' },
  { id: 6, title: 'Finalizando', description: 'Completando el proceso' },
];

export const SignatureProgress: React.FC<SignatureProgressProps> = ({
  currentStep,
  isProcessing
}) => {
  const progress = isProcessing ? (currentStep / (steps.length - 1)) * 100 : 0;

  if (!isProcessing && currentStep === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Procesando Firma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id && isProcessing;
            const isPending = currentStep < step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-blue-50 border border-blue-200'
                    : isCompleted
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? 'text-blue-900'
                        : isCompleted
                        ? 'text-green-900'
                        : 'text-gray-900'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-xs ${
                      isCurrent
                        ? 'text-blue-600'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
