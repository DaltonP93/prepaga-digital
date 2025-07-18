
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSignatureByToken } from '@/hooks/useSignature';
import { useSignatureFlow } from '@/hooks/useSignatureFlow';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { SignatureProgress } from '@/components/SignatureProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  FileText, 
  User, 
  CreditCard, 
  Calendar,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function SignatureView() {
  const { token } = useParams<{ token: string }>();
  const [signatureData, setSignatureData] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  
  const { data: sale, isLoading, error } = useSignatureByToken(token || '');
  const { processSignature, isProcessing, currentStep } = useSignatureFlow();

  useEffect(() => {
    // Registrar acceso al documento
    if (sale) {
      // Aquí podrías registrar el tracking si está implementado
      console.log('Documento accedido:', sale.id);
    }
  }, [sale]);

  const handleSignature = async () => {
    if (!signatureData || !sale) return;

    // Usar el primer documento disponible o crear uno por defecto
    const documentId = sale.documents?.[0]?.id || sale.id;
    
    const result = await processSignature(sale, signatureData, documentId);
    
    if (result.success) {
      setIsCompleted(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Token inválido o expirado</h2>
            <p className="text-gray-600">
              El enlace de firma no es válido o ha expirado. 
              Por favor, contacte con su agente para obtener un nuevo enlace.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-semibold text-green-900">
              ¡Documento Firmado!
            </h2>
            <p className="text-gray-600">
              Su documento ha sido firmado exitosamente. 
              Recibirá una copia por email en las próximas horas.
            </p>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                Gracias por confiar en nosotros
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <FileText className="h-6 w-6" />
              Firma Digital de Contrato
            </CardTitle>
            <p className="text-gray-600">
              Por favor, revise la información y firme el documento
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del Cliente y Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">
                    {sale.clients?.first_name} {sale.clients?.last_name}
                  </p>
                  <p className="text-gray-600">{sale.clients?.email}</p>
                  {sale.clients?.phone && (
                    <p className="text-gray-600">{sale.clients?.phone}</p>
                  )}
                  {sale.clients?.dni && (
                    <p className="text-gray-600">DNI: {sale.clients?.dni}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Plan Contratado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{sale.plans?.name}</h3>
                    <p className="text-gray-600">{sale.plans?.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-semibold">
                    {Number(sale.plans?.price || 0).toLocaleString()} Gs.
                  </Badge>
                </div>
                
                {sale.plans?.coverage_details && (
                  <div>
                    <h4 className="font-medium mb-2">Cobertura:</h4>
                    <p className="text-sm text-gray-600">{sale.plans?.coverage_details}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalles de la Venta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Detalles de la Venta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sale.request_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nº Solicitud:</span>
                    <span className="font-medium">{sale.request_number}</span>
                  </div>
                )}
                {sale.contract_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nº Contrato:</span>
                    <span className="font-medium">{sale.contract_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">
                    {new Date(sale.created_at || '').toLocaleDateString()}
                  </span>
                </div>
                {sale.total_amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto Total:</span>
                    <span className="font-semibold text-lg">
                      {Number(sale.total_amount).toLocaleString()} Gs.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel de Firma */}
          <div className="space-y-6">
            {!isProcessing ? (
              <Card>
                <CardHeader>
                  <CardTitle>Firma Digital</CardTitle>
                  <p className="text-sm text-gray-600">
                    Dibuje su firma en el área de abajo
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SignatureCanvas
                    onSignatureChange={setSignatureData}
                    width={300}
                    height={200}
                  />
                  
                  <Separator />
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Al firmar este documento, acepta los términos y condiciones 
                      del contrato de seguro y confirma que la información proporcionada es correcta.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    onClick={handleSignature}
                    disabled={!signatureData || isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      'Firmar Documento'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <SignatureProgress
                currentStep={currentStep}
                isProcessing={isProcessing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
