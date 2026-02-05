import { useParams } from "react-router-dom";
import { useSignatureLinkByToken, useSubmitSignatureLink, useSignatureLinkDocuments } from "@/hooks/useSignatureLinkPublic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleLayout } from "@/components/SimpleLayout";
import { EnhancedSignatureCanvas } from "@/components/signature/EnhancedSignatureCanvas";
import { useState } from "react";
import { 
  FileText, 
  User, 
  Calendar, 
  Building, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Shield,
  Loader2
} from "lucide-react";
import DOMPurify from 'dompurify';

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const { data: linkData, isLoading, error } = useSignatureLinkByToken(token || '');
  const { data: documents } = useSignatureLinkDocuments(linkData?.sale_id);
  const submitSignature = useSubmitSignatureLink();
  
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSignatureComplete = async () => {
    if (!signatureData || !linkData || !termsAccepted) return;

    await submitSignature.mutateAsync({
      linkId: linkData.id,
      token: token!,
      signatureData,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <SimpleLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Cargando documento...</p>
        </div>
      </SimpleLayout>
    );
  }

  // Error state
  if (error || !linkData) {
    return (
      <SimpleLayout>
        <div className="flex justify-center py-12">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Enlace no válido</CardTitle>
              <CardDescription>
                El enlace de firma no es válido, ha expirado o ya fue utilizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Si crees que esto es un error, contacta con tu agente de ventas.
              </p>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  // Already signed state
  if (linkData.status === 'completado') {
    return (
      <SimpleLayout>
        <div className="max-w-2xl mx-auto py-12">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl text-primary">
                ¡Documento firmado exitosamente!
              </CardTitle>
              <CardDescription>
                Su firma ha sido registrada correctamente el{' '}
                {linkData.completed_at 
                  ? new Date(linkData.completed_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : ''
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Proceso completado
              </Badge>
              <p className="text-sm text-muted-foreground">
                Recibirás una copia del documento firmado por correo electrónico.
              </p>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  const sale = linkData.sale;
  const client = sale?.clients;
  const plan = sale?.plans;
  const company = sale?.companies;

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        {/* Company Header */}
        {company && (
          <div className="text-center space-y-2">
            {company.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="h-16 mx-auto object-contain"
              />
            )}
            <h1 className="text-2xl font-bold" style={{ color: company.primary_color || undefined }}>
              {company.name}
            </h1>
          </div>
        )}

        {/* Document Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Documento para Firma Digital</CardTitle>
                  <CardDescription>
                    Hola, por favor revise la información y firme al final
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expira: {new Date(linkData.expires_at).toLocaleDateString('es-ES')}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Contract Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Information */}
          {client && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Titular del Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{client.first_name} {client.last_name}</p>
                {client.dni && <p className="text-muted-foreground">DNI: {client.dni}</p>}
                {client.email && <p className="text-muted-foreground">{client.email}</p>}
                {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
              </CardContent>
            </Card>
          )}

          {/* Plan Information */}
          {plan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Plan Contratado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{plan.name}</p>
                <p className="text-xl font-bold text-primary">
                  ${Number(plan.price || 0).toLocaleString('es-AR')}
                </p>
                {plan.description && (
                  <p className="text-muted-foreground text-xs">{plan.description}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contract Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Detalles del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {sale?.contract_number && (
                <div>
                  <p className="text-muted-foreground">Nº Contrato</p>
                  <p className="font-mono font-medium">{sale.contract_number}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {new Date(sale?.sale_date || '').toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium text-primary">
                  ${Number(sale?.total_amount || 0).toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Firmante</p>
                <p className="font-medium">{linkData.recipient_type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents to Review */}
        {documents && documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documentos a Firmar</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{doc.name}</h4>
                        <Badge variant="outline">{doc.document_type || 'Documento'}</Badge>
                      </div>
                      {doc.content && (
                        <div 
                          className="prose prose-sm max-w-none text-sm text-muted-foreground max-h-[200px] overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(doc.content) }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Firma Digital
            </CardTitle>
            <CardDescription>
              Dibuje su firma en el área a continuación. Esta firma tendrá validez legal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EnhancedSignatureCanvas
              onSignatureChange={setSignatureData}
              width={600}
              height={200}
            />

            <Separator />

            {/* Terms */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-muted-foreground">
                  He leído y acepto los términos y condiciones. Confirmo que la información 
                  proporcionada es correcta y completa. Autorizo el procesamiento de mis datos 
                  personales según la política de privacidad.
                </span>
              </label>
            </div>

            <Button
              onClick={handleSignatureComplete}
              disabled={!signatureData || !termsAccepted || submitSignature.isPending}
              className="w-full"
              size="lg"
            >
              {submitSignature.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando firma...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Firmar Documento
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Al firmar, se registrará su IP y hora de firma por seguridad.
            </p>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
};

export default SignatureView;
