import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { Link } from 'react-router-dom';

const PaymentCanceled = () => {
  return (
    <Layout title="Pago Cancelado">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader className="pb-6">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-orange-700">
              Pago Cancelado
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800">
                El proceso de pago fue cancelado. No se realizó ningún cargo a tu tarjeta.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">¿Qué puedes hacer?</h3>
              <div className="text-left space-y-2">
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>Intenta nuevamente con el mismo o diferente método de pago</span>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>Verifica que tu tarjeta tenga fondos suficientes</span>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span>Contacta con tu banco si el problema persiste</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/plans">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Intentar Nuevamente
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Link>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>¿Necesitas ayuda? <Link to="/contact" className="text-primary hover:underline">Contáctanos</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentCanceled;