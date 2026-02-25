import { useParams } from "react-router-dom";
import { useSignatureLinkByToken, useSubmitSignatureLink, useSignatureLinkDocuments, useAllSignatureLinksPublic } from "@/hooks/useSignatureLinkPublic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PublicLayout from "@/layouts/PublicLayout";
import { EnhancedSignatureCanvas } from "@/components/signature/EnhancedSignatureCanvas";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText, User, Calendar, Building, CheckCircle, Clock, AlertCircle,
  Shield, Loader2, Download, Users, PenTool, Paperclip, Eye
} from "lucide-react";
import DOMPurify from 'dompurify';
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  const [signwellCompleted, setSignwellCompleted] = useState(false);
  const signatureSectionRef = useRef<HTMLDivElement>(null);

  // Check if this link has a SignWell signing URL
  const signwellSigningUrl = (linkData as any)?.signwell_signing_url;

  // Listen for SignWell postMessage events (embedded signing completion)
  const handleSignWellMessage = useCallback((event: MessageEvent) => {
    // SignWell sends a postMessage when signing is complete
    if (event.data?.type === 'signwell_event' && event.data?.event === 'completed') {
      setSignwellCompleted(true);
      // Submit as signwell_completed
      if (linkData && token) {
        submitSignature.mutate({
          linkId: linkData.id,
          token: token,
          signatureData: 'signwell_completed',
        });
      }
    }
  }, [linkData, token]);

  useEffect(() => {
    if (signwellSigningUrl) {
      window.addEventListener('message', handleSignWellMessage);
      return () => window.removeEventListener('message', handleSignWellMessage);
    }
  }, [signwellSigningUrl, handleSignWellMessage]);

  const handleDownloadSignedContent = (doc: any) => {
    if (!doc?.content) return;
    const htmlContent = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${doc.name}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          img { max-width: 280px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${doc.content}
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

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
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Cargando documento...</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !linkData) {
    return (
      <PublicLayout>
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
      </PublicLayout>
    );
  }

  // Already signed state
  if (linkData.status === 'completado') {
    const isTitular = linkData.recipient_type === 'titular';
    const completedAdherenteLinks = isTitular 
      ? (allLinks || []).filter((l: any) => l.recipient_type === 'adherente' && l.status === 'completado')
      : [];

    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
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

          {documents && documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.map((doc: any) => {
                  const isAnexo = doc.requires_signature === false || doc.document_type === 'anexo';
                  return (
                    <div key={doc.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAnexo ? (
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type === 'anexo' ? 'Anexo' : (doc.document_type || 'Documento')}
                            </p>
                            {isAnexo && <Badge variant="secondary" className="text-[10px] ml-1">Anexo</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.file_url && !doc.content && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('documents')
                                .createSignedUrl(doc.file_url, 3600);
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              }
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Descargar
                          </Button>
                        )}
                        {!doc.file_url && doc.content && (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadSignedContent(doc)}>
                            <Download className="h-3 w-3 mr-1" />
                            Descargar PDF
                          </Button>
                        )}
                        {doc.file_url && doc.content && (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadSignedContent(doc)}>
                            <Download className="h-3 w-3 mr-1" />
                            Descargar PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

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
      </PublicLayout>
    );
  }

  const sale = linkData.sale;
  const client = sale?.clients;
  const plan = sale?.plans;
  const company = sale?.companies;
  const isTitular = linkData.recipient_type === 'titular';

  // Build recipient name for display
  const getRecipientName = () => {
    if (isTitular && client) return `${client.first_name} ${client.last_name}`;
    if (!isTitular && linkData.recipient_id && sale?.beneficiaries) {
      const ben = sale.beneficiaries.find((b: any) => b.id === linkData.recipient_id);
      if (ben) return `${ben.first_name} ${ben.last_name}`;
    }
    return '';
  };
  const recipientName = getRecipientName();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>
                    {isTitular ? 'Documentos para Firma - Titular' : 'DDJJ de Salud - Adherente'}
                  </CardTitle>
                  <CardDescription>
                    {isTitular 
                      ? 'Revise los documentos y firme al final'
                      : 'Revise su Declaración Jurada y firme al final'
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

        {/* Contract Info Summary */}
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
                {client.dni && <p className="text-muted-foreground">C.I.: {client.dni}</p>}
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

        {/* Documents List - Separated into signature-required and annexes */}
        {(() => {
          // Annexes are documents that don't require signature OR have annex-related document_type
          const isAnnex = (d: any) => d.requires_signature === false || d.document_type === 'anexo' || d.document_type?.includes('anexo');
          const annexDocs = documents?.filter((d: any) => isAnnex(d)) || [];
          const docsToSign = documents?.filter((d: any) => !isAnnex(d)) || [];
          const hasAnyDocs = docsToSign.length > 0 || annexDocs.length > 0;

          if (!hasAnyDocs) {
            return (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos disponibles para firmar aún.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Los documentos serán generados por el vendedor. Vuelva a intentar más tarde.
                  </p>
                </CardContent>
              </Card>
            );
          }

          return (
            <>
              {/* Documents requiring signature */}
              {docsToSign.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {isTitular
                        ? `Documentos a Firmar (${docsToSign.length})`
                        : 'Documentos'
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {docsToSign.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm">
                                {doc.name}{recipientName ? ` - ${recipientName}` : ''}
                              </p>
                              <p className="text-xs text-muted-foreground">{doc.document_type || 'Documento'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.content && (
                              <Button size="sm" variant="outline" onClick={() => handleDownloadSignedContent(doc)}>
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Informational annexes (read-only) */}
              {annexDocs.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Anexos ({annexDocs.length})
                    </CardTitle>
                    <CardDescription>Documentos informativos adjuntos. No requieren firma.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {annexDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type === 'anexo' ? 'Anexo' : (doc.document_type || 'Documento')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Solo lectura</Badge>
                          {doc.file_url && !doc.content && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { data } = await supabase.storage
                                  .from('documents')
                                  .createSignedUrl(doc.file_url, 3600);
                                if (data?.signedUrl) {
                                  window.open(data.signedUrl, '_blank');
                                }
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          )}
                          {doc.content && (
                            <Button size="sm" variant="outline" onClick={() => handleDownloadSignedContent(doc)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

        {/* Signature Section - always visible when there are documents */}
        {documents && documents.filter((d: any) => d.requires_signature !== false).length > 0 && (
          <div ref={signatureSectionRef}>
            {signwellSigningUrl && !signwellCompleted ? (
              /* SignWell Embedded Signing via iframe */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Firma Electrónica
                  </CardTitle>
                  <CardDescription>
                    Firme el documento a través de la plataforma segura SignWell.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full border rounded-lg overflow-hidden" style={{ height: '700px' }}>
                    <iframe
                      src={signwellSigningUrl}
                      title="SignWell Firma"
                      className="w-full h-full border-0"
                      allow="camera; microphone"
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    Complete la firma en el formulario de arriba. La página se actualizará automáticamente.
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Canvas-based signature (default / fallback) */
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
                        Firmar Todos los Documentos
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Al firmar, se registrará su IP y hora de firma por seguridad.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default SignatureView;
