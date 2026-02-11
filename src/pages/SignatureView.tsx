import { useParams } from "react-router-dom";
import { useSignatureLinkByToken, useSubmitSignatureLink, useSignatureLinkDocuments, useAllSignatureLinksPublic } from "@/hooks/useSignatureLinkPublic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleLayout } from "@/components/SimpleLayout";
import { EnhancedSignatureCanvas } from "@/components/signature/EnhancedSignatureCanvas";
import { useState } from "react";
import { 
  FileText, User, Calendar, Building, CheckCircle, Clock, AlertCircle,
  Shield, Loader2, Download, Users
} from "lucide-react";
import DOMPurify from 'dompurify';
import { formatCurrency } from "@/lib/utils";

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const { data: linkData, isLoading, error } = useSignatureLinkByToken(token || '');
  const { data: documents } = useSignatureLinkDocuments(
    linkData?.sale_id, 
    linkData?.recipient_type, 
    linkData?.recipient_id,
    token || undefined
  );
  const { data: allLinks } = useAllSignatureLinksPublic(linkData?.sale_id, token || undefined);
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

  const handleDownloadSignature = () => {
    if (!signatureData) return;
    const link = document.createElement('a');
    link.download = `firma-${linkData?.recipient_type || 'documento'}-${Date.now()}.png`;
    link.href = signatureData;
    link.click();
  };

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

  // Already signed state - show download options
  if (linkData.status === 'completado') {
    const isTitular = linkData.recipient_type === 'titular';
    // For titular, show all completed signature links
    const completedAdherenteLinks = isTitular 
      ? (allLinks || []).filter((l: any) => l.recipient_type === 'adherente' && l.status === 'completado')
      : [];

    return (
      <SimpleLayout>
        <div className="max-w-2xl mx-auto py-12 space-y-6">
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
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : ''
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Proceso completado
              </Badge>
            </CardContent>
          </Card>

          {/* Show documents for download */}
          {documents && documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Documentos Firmados
                </CardTitle>
                <CardDescription>
                  {isTitular 
                    ? 'Aquí puede ver y descargar todos los documentos firmados'
                    : 'Aquí puede ver su documento firmado'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.document_type || 'Documento'}</p>
                      </div>
                    </div>
                    {doc.file_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3 mr-1" />
                          Descargar
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Titular sees adherente completion status */}
          {isTitular && completedAdherenteLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Firmas de Adherentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {completedAdherenteLinks.map((aLink: any) => {
                  const beneficiary = linkData.sale?.beneficiaries?.find(
                    (b: any) => b.id === aLink.recipient_id
                  );
                  return (
                    <div key={aLink.id} className="flex items-center justify-between border rounded p-2">
                      <span className="text-sm">
                        {beneficiary ? `${beneficiary.first_name} ${beneficiary.last_name}` : 'Adherente'}
                      </span>
                      <Badge variant="default">✓ Firmado</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </SimpleLayout>
    );
  }

  const sale = linkData.sale;
  const client = sale?.clients;
  const plan = sale?.plans;
  const company = sale?.companies;
  const isTitular = linkData.recipient_type === 'titular';

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        {/* Company Header */}
        {company && (
          <div className="text-center space-y-2">
            {company.logo_url && (
              <img src={company.logo_url} alt={company.name} className="h-16 mx-auto object-contain" />
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
                  <CardTitle>
                    {isTitular ? 'Documentos para Firma - Titular' : 'DDJJ de Salud - Adherente'}
                  </CardTitle>
                  <CardDescription>
                    {isTitular 
                      ? 'Revise todos los documentos del contrato y firme al final'
                      : 'Revise su Declaración Jurada de Salud y firme al final'
                    }
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
          {client && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {isTitular ? 'Titular del Contrato' : 'Información del Contrato'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{client.first_name} {client.last_name}</p>
                {client.dni && <p className="text-muted-foreground">DNI: {client.dni}</p>}
                {isTitular && client.email && <p className="text-muted-foreground">{client.email}</p>}
              </CardContent>
            </Card>
          )}

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
                  {formatCurrency(Number(plan.price || 0))}
                </p>
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
                  {formatCurrency(Number(sale?.total_amount || 0))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Firmante</p>
                <p className="font-medium capitalize">{linkData.recipient_type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents to Review */}
        {documents && documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isTitular 
                  ? `Documentos a Firmar (${documents.length})`
                  : 'Declaración Jurada de Salud'
                }
              </CardTitle>
              <CardDescription>
                {isTitular 
                  ? 'Revise todos los documentos antes de firmar'
                  : 'Revise su declaración jurada antes de firmar'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {documents.map((doc: any) => (
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
                      {doc.file_url && (
                        <Button size="sm" variant="outline" className="mt-2" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" />
                            Ver documento completo
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {documents && documents.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay documentos disponibles para firmar aún.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Los documentos serán generados por el vendedor. Vuelva a intentar más tarde.
              </p>
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

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border"
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
                  Firmar {isTitular ? 'Todos los Documentos' : 'Declaración Jurada'}
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
