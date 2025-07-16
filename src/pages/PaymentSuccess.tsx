import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for payment verification
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Layout title="Procesando Pago">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verificando el pago...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pago Exitoso">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader className="pb-6">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              ¡Pago Procesado Exitosamente!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                Tu pago ha sido procesado correctamente. Recibirás un email de confirmación en breve.
              </p>
              {sessionId && (
                <p className="text-sm text-green-600 mt-2">
                  ID de sesión: {sessionId}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">¿Qué sigue?</h3>
              <div className="text-left space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Recibirás un email de confirmación</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Tu plan se activará automáticamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Podrás acceder a todas las funcionalidades</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Link>
              </Button>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar Recibo
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>¿Tienes algún problema? <Link to="/contact" className="text-primary hover:underline">Contáctanos</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;