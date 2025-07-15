import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useSignatureByToken } from '@/hooks/useSignature';
import { useSignatureFlow } from '@/hooks/useSignatureFlow';
import { supabase } from '@/integrations/supabase/client';
import { FileText, User, Building, Calendar, DollarSign, Download } from 'lucide-react';

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const [signatureCompleted, setSignatureCompleted] = useState(false);
  
  const { data: sale, isLoading, error } = useSignatureByToken(token || '');
  const { processSignature, isProcessing } = useSignatureFlow();

  const handleSignature = async (signature: string) => {
    if (!sale?.documents?.[0]) return;
    
    const result = await processSignature(sale, signature, sale.documents[0].id);
    
    if (result.success) {
      setSignatureCompleted(true);
    }
  };

  const downloadSignedDocument = async () => {
    if (!sale?.signed_document_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(sale.signed_document_url);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrato-${sale.clients?.first_name}-${sale.clients?.last_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !sale) {
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
  const isSigned = sale.status === 'firmado' || signatureCompleted;

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
                <p><strong>Nombre:</strong> {sale.clients?.first_name} {sale.clients?.last_name}</p>
                <p><strong>Email:</strong> {sale.clients?.email}</p>
                <p><strong>Teléfono:</strong> {sale.clients?.phone}</p>
                <p><strong>DNI:</strong> {sale.clients?.dni}</p>
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
                <p><strong>Plan:</strong> {sale.plans?.name}</p>
                <p><strong>Precio:</strong> €{sale.plans?.price}</p>
                <p><strong>Descripción:</strong> {sale.plans?.description}</p>
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
                    {sale.profiles?.first_name} {sale.profiles?.last_name}
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
              <CardContent>
                <SignatureCanvas 
                  onSign={handleSignature}
                  disabled={isProcessing}
                  isProcessing={isProcessing}
                />
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
                <p className="text-muted-foreground mb-4">
                  El documento ha sido firmado exitosamente. Puede descargar una copia firmada.
                </p>
                {sale.signed_document_url && (
                  <Button onClick={downloadSignedDocument}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Documento Firmado
                  </Button>
                )}
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
