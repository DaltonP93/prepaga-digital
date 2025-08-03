
import { useParams } from "react-router-dom";
import { useSignatureByToken } from "@/hooks/useSignature";
import { useSignatureFlow } from "@/hooks/useSignatureFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SimpleLayout } from "@/components/SimpleLayout";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { SignatureProcessFlow } from "@/components/SignatureProcessFlow";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FileText, User, DollarSign, Calendar, Building } from "lucide-react";

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const { data: saleData, isLoading, error } = useSignatureByToken(token || '');
  const { processSignature, isProcessing, currentStep } = useSignatureFlow();
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSignatureComplete = async () => {
    if (!signatureData || !saleData) {
      toast({
        title: "Error",
        description: "Por favor, complete su firma antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitted(true);
    
    const result = await processSignature(
      saleData,
      signatureData,
      saleData.documents?.[0]?.id || 'default-doc-id'
    );

    if (result.success) {
      toast({
        title: "¡Éxito!",
        description: "Su firma ha sido procesada correctamente.",
      });
    } else {
      setIsSubmitted(false);
      toast({
        title: "Error",
        description: result.error || "Hubo un problema al procesar su firma.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <SimpleLayout>
        <div className="flex justify-center py-8">
          <p>Cargando documento...</p>
        </div>
      </SimpleLayout>
    );
  }

  if (error || !saleData) {
    return (
      <SimpleLayout>
        <div className="flex justify-center py-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Documento no encontrado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                El enlace de firma no es válido o ha expirado.
              </p>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  if (isSubmitted && (saleData.status === 'firmado' || saleData.status === 'completado')) {
    return (
      <SimpleLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">
                ✅ Documento firmado exitosamente
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Su firma ha sido registrada correctamente. El documento ha sido procesado y guardado.
              </p>
              <Badge className="bg-green-100 text-green-800">
                Proceso completado
              </Badge>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  const client = saleData.clients;
  const plan = saleData.plans;
  const salesperson = saleData.profiles;

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Documento para Firma Digital
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Por favor, revise la información y complete su firma al final del documento
            </p>
          </CardHeader>
        </Card>

        {/* Contract Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Information */}
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{client.first_name} {client.last_name}</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                  {client.phone && (
                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                  )}
                  {client.dni && (
                    <p className="text-sm text-muted-foreground">CI: {client.dni}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Information */}
          {plan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5" />
                  Plan Contratado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-lg font-bold text-green-600">
                    {Number(plan.price || 0).toLocaleString()} Gs.
                  </p>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalles del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Fecha de venta:</p>
                <p className="text-muted-foreground">
                  {new Date(saleData.sale_date || '').toLocaleDateString()}
                </p>
              </div>
              {saleData.contract_number && (
                <div>
                  <p className="font-medium">Número de contrato:</p>
                  <p className="text-muted-foreground font-mono">
                    {saleData.contract_number}
                  </p>
                </div>
              )}
              {saleData.request_number && (
                <div>
                  <p className="font-medium">Número de solicitud:</p>
                  <p className="text-muted-foreground font-mono">
                    {saleData.request_number}
                  </p>
                </div>
              )}
            </div>

            {salesperson && (
              <div className="pt-4 border-t">
                <p className="text-sm">
                  <span className="font-medium">Vendedor: </span>
                  {salesperson.first_name} {salesperson.last_name} ({salesperson.email})
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Process Flow */}
        <SignatureProcessFlow 
          currentStep={currentStep} 
          isProcessing={isProcessing}
          status={saleData.status}
        />

        {/* Signature Section */}
        {!isSubmitted && saleData.status !== 'firmado' && (
          <Card>
            <CardHeader>
              <CardTitle>Firma Digital</CardTitle>
              <p className="text-sm text-muted-foreground">
                Dibuje su firma en el área a continuación
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignatureCanvas onSignatureChange={setSignatureData} />
              
              <Separator />
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Al firmar este documento, usted confirma que:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Ha leído y acepta todos los términos y condiciones</li>
                  <li>• La información proporcionada es correcta y completa</li>
                  <li>• Autoriza el procesamiento de sus datos personales</li>
                  <li>• Acepta el plan y precio especificados</li>
                </ul>
                
                <Button 
                  onClick={handleSignatureComplete}
                  disabled={!signatureData || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? "Procesando..." : "Firmar Documento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SimpleLayout>
  );
};

export default SignatureView;
