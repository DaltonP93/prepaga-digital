
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PenTool, Download, CheckCircle } from "lucide-react";

const SignatureView = () => {
  const { token } = useParams();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <PenTool className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle>Firma Digital</CardTitle>
            <CardDescription>
              Revisa y firma los documentos de tu póliza de seguro médico
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos para Firmar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Solicitud de Incorporación</p>
                  <p className="text-sm text-muted-foreground">Datos personales y contacto</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Ver
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Contrato de Servicios</p>
                  <p className="text-sm text-muted-foreground">Términos y condiciones</p>
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Confirmación de Datos</p>
                  <p className="text-sm text-muted-foreground">Verificación de información</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Ver
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Recibo de Pago Inicial</p>
                  <p className="text-sm text-muted-foreground">Comprobante de pago</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Ver
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button className="w-full" size="lg">
            <PenTool className="mr-2 h-4 w-4" />
            Continuar con Firma
          </Button>
          
          <Button variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Descargar Documentos
          </Button>
        </div>

        {/* Footer */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Token de sesión: {token}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Esta sesión expira en 24 horas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignatureView;
