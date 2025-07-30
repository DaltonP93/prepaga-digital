
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SimpleLayout } from '@/components/SimpleLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, User, Calendar, DollarSign } from 'lucide-react';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useSignature } from '@/hooks/useSignature';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const [signature, setSignature] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [saleData, setSaleData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { submitSignature, isSubmitting } = useSignature();

  useEffect(() => {
    const fetchSaleData = async () => {
      if (!token) {
        setError('Token de firma inválido');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/signature/${token}`);
        if (!response.ok) {
          throw new Error('No se pudo cargar los datos de la venta');
        }
        const data = await response.json();
        setSaleData(data);
      } catch (err) {
        console.error('Error fetching sale data:', err);
        setError('Error al cargar los datos de la venta');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaleData();
  }, [token]);

  const handleSubmitSignature = async () => {
    if (!signature || !token) return;

    try {
      await submitSignature.mutateAsync({
        token,
        signature,
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Error submitting signature:', error);
    }
  };

  if (isLoading) {
    return (
      <SimpleLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Cargando documento...</p>
            <p className="text-sm text-muted-foreground">Por favor espere</p>
          </div>
        </div>
      </SimpleLayout>
    );
  }

  if (error || !saleData) {
    return (
      <SimpleLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Error</CardTitle>
              <CardDescription className="text-center">
                {error || 'No se pudo cargar el documento'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                El enlace puede haber expirado o no ser válido.
              </p>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Firma Digital de Contrato</h1>
          <p className="text-muted-foreground">
            Por favor, revise la información y firme el documento
          </p>
        </div>

        {/* Información del contrato */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">
                      {saleData.client?.first_name} {saleData.client?.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {saleData.plan?.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Monto</p>
                    <p className="text-sm text-muted-foreground">
                      ₲{Number(saleData.total_amount || 0).toLocaleString('es-PY')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Fecha</p>
                    <p className="text-sm text-muted-foreground">
                      {saleData.created_at ? format(new Date(saleData.created_at), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canvas de firma */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Firma Digital</CardTitle>
            <CardDescription>
              Dibuje su firma en el espacio a continuación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignatureCanvas
              onSignatureChange={setSignature}
              width={600}
              height={200}
            />
          </CardContent>
        </Card>

        {/* Botón de envío */}
        <div className="text-center">
          <Button
            onClick={handleSubmitSignature}
            disabled={!signature || isSubmitting}
            size="lg"
            className="min-w-[200px]"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Procesando...' : 'Firmar Contrato'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Al firmar, usted acepta los términos y condiciones del contrato
          </p>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default SignatureView;
