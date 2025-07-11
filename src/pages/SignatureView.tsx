
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, User, Building, Calendar, DollarSign } from 'lucide-react';

interface Sale {
  id: string;
  client_id: string;
  company_id: string;
  plan_id: string;
  salesperson_id: string;
  sale_date: string;
  total_amount: number;
  status: string;
  signature_token: string;
  signature_expires_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
  clients: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni: string;
  };
  plans: {
    name: string;
    description: string;
    price: number;
    coverage_details: string;
  };
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
  documents: Array<{
    id: string;
    name: string;
    content: string;
    document_type: string;
    is_required: boolean;
  }>;
}

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  useEffect(() => {
    if (token) {
      fetchSaleData();
    }
  }, [token]);

  const fetchSaleData = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (first_name, last_name, email, phone, dni),
          plans (name, description, price, coverage_details),
          profiles (first_name, last_name, email),
          documents (id, name, content, document_type, is_required)
        `)
        .eq('signature_token', token)
        .single();

      if (error) throw error;

      // Check if signature link is still valid
      if (new Date(data.signature_expires_at) < new Date()) {
        toast.error('El enlace de firma ha expirado');
        return;
      }

      setSale(data);
    } catch (error: any) {
      console.error('Error fetching sale data:', error);
      toast.error('Error al cargar los datos de la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = async () => {
    if (!signatureData || !sale) {
      toast.error('Por favor, firme el documento antes de continuar');
      return;
    }

    setSigning(true);

    try {
      // Save signature
      const { error: signatureError } = await supabase
        .from('signatures')
        .insert({
          sale_id: sale.id,
          signature_data: signatureData,
          status: 'firmado',
          ip_address: '0.0.0.0', // In production, get real IP
          user_agent: navigator.userAgent,
        });

      if (signatureError) throw signatureError;

      // Update sale status
      const { error: saleError } = await supabase
        .from('sales')
        .update({ status: 'firmado' })
        .eq('id', sale.id);

      if (saleError) throw saleError;

      toast.success('¡Documento firmado exitosamente!');
      
      // Refresh sale data
      await fetchSaleData();
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast.error('Error al guardar la firma');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Documento no encontrado</h2>
            <p className="text-muted-foreground">
              El enlace de firma no es válido o ha expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(sale.signature_expires_at) < new Date();
  const isSigned = sale.status === 'firmado';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Firma de Documento</CardTitle>
                <Badge variant={isSigned ? 'default' : isExpired ? 'destructive' : 'secondary'}>
                  {isSigned ? 'Firmado' : isExpired ? 'Expirado' : 'Pendiente'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Sale Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Nombre:</strong> {sale.clients.first_name} {sale.clients.last_name}</p>
                <p><strong>Email:</strong> {sale.clients.email}</p>
                <p><strong>Teléfono:</strong> {sale.clients.phone}</p>
                <p><strong>DNI:</strong> {sale.clients.dni}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Información del Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Plan:</strong> {sale.plans.name}</p>
                <p><strong>Precio:</strong> €{sale.plans.price}</p>
                <p><strong>Descripción:</strong> {sale.plans.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sale Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Detalles de la Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Venta</p>
                  <p className="font-medium">
                    {new Date(sale.sale_date).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Total</p>
                  <p className="font-medium">€{sale.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">
                    {sale.profiles.first_name} {sale.profiles.last_name}
                  </p>
                </div>
              </div>
              {sale.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{sale.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          {sale.documents && sale.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sale.documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{doc.name}</h4>
                        <Badge variant={doc.is_required ? 'destructive' : 'secondary'}>
                          {doc.is_required ? 'Requerido' : 'Opcional'}
                        </Badge>
                      </div>
                      {doc.content && (
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: doc.content }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature Section */}
          {!isSigned && !isExpired && (
            <Card>
              <CardHeader>
                <CardTitle>Firma Digital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignatureCanvas onSignatureChange={setSignatureData} />
                <div className="flex justify-center">
                  <Button 
                    onClick={handleSignature}
                    disabled={signing || !signatureData}
                    size="lg"
                  >
                    {signing ? 'Firmando...' : 'Firmar Documento'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isSigned && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-green-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">¡Documento Firmado!</h3>
                <p className="text-muted-foreground">
                  El documento ha sido firmado exitosamente. Recibirá una copia por email.
                </p>
              </CardContent>
            </Card>
          )}

          {isExpired && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-red-500 mb-4">
                  <Calendar className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Enlace Expirado</h3>
                <p className="text-muted-foreground">
                  Este enlace de firma ha expirado. Contacte con su vendedor para obtener un nuevo enlace.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureView;
