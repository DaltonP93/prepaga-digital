
import { useParams, Navigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PenTool, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useSignatureByToken, useCreateSignature, useCompleteSignature } from "@/hooks/useSignature";
import { toast } from "sonner";
import { generatePDFContent, downloadPDF } from "@/lib/pdfGenerator";

const SignatureView = () => {
  const { token } = useParams<{ token: string }>();
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [signedDocuments, setSignedDocuments] = useState<Set<string>>(new Set());
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);

  const { data: saleData, isLoading, error } = useSignatureByToken(token || '');
  const createSignature = useCreateSignature();
  const completeSignature = useCompleteSignature();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando documentos...</p>
        </div>
      </div>
    );
  }

  if (error || !saleData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enlace No Válido</h2>
            <p className="text-muted-foreground">
              Este enlace de firma ha expirado o no es válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { clients: client, plans: plan, documents } = saleData;
  const currentDocument = documents?.[currentDocumentIndex];
  const allDocumentsSigned = documents?.every(doc => signedDocuments.has(doc.id));

  const handleSignDocument = async (signatureData: string) => {
    if (!currentDocument) return;

    try {
      await createSignature.mutateAsync({
        saleId: saleData.id,
        documentId: currentDocument.id,
        signatureData,
      });

      setSignedDocuments(prev => new Set([...prev, currentDocument.id]));
      setShowSignatureCanvas(false);

      // Check if this was the last document
      if (currentDocumentIndex < (documents?.length || 0) - 1) {
        setCurrentDocumentIndex(currentDocumentIndex + 1);
        toast.success("Documento firmado. Continúe con el siguiente.");
      } else {
        // All documents signed, complete the process
        await completeSignature.mutateAsync(saleData.id);
        toast.success("¡Todos los documentos han sido firmados!");
      }
    } catch (error) {
      console.error('Error signing document:', error);
    }
  };

  const handleDownloadSignedDocuments = async () => {
    if (!client || !plan || !saleData.companies) return;

    const signatures = Array.from(signedDocuments).map(docId => ({
      signature_data: 'data:image/png;base64,signature_placeholder', // In real app, get actual signature
      signed_at: new Date().toISOString(),
      document_id: docId,
    }));

    const pdfData = {
      content: documents?.map(doc => doc.content).join('\n\n') || '',
      signatures,
      client,
      plan,
      company: saleData.companies,
    };

    const htmlContent = generatePDFContent(pdfData);
    await downloadPDF(htmlContent, `Documentos-Firmados-${client.first_name}-${client.last_name}.pdf`);
  };

  const getDocumentIcon = (docType?: string) => {
    const baseClass = "h-5 w-5";
    switch (docType) {
      case 'contract': return <FileText className={`${baseClass} text-blue-600`} />;
      case 'form': return <FileText className={`${baseClass} text-green-600`} />;
      case 'receipt': return <FileText className={`${baseClass} text-purple-600`} />;
      default: return <FileText className={`${baseClass} text-orange-600`} />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
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
              {client?.first_name} {client?.last_name} - Plan: {plan?.name}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">
                Progreso: {signedDocuments.size} de {documents?.length || 0} documentos firmados
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(((signedDocuments.size) / (documents?.length || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((signedDocuments.size) / (documents?.length || 1)) * 100}%` 
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos para Firmar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents?.map((document, index) => (
              <div 
                key={document.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                  index === currentDocumentIndex 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getDocumentIcon(document.document_type)}
                  <div>
                    <p className="font-medium">{document.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {document.document_type === 'form' && 'Datos personales y contacto'}
                      {document.document_type === 'contract' && 'Términos y condiciones'}
                      {document.document_type === 'receipt' && 'Comprobante de pago'}
                      {!document.document_type && 'Documento de verificación'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {signedDocuments.has(document.id) ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : index === currentDocumentIndex ? (
                    <span className="text-sm font-medium text-primary">Actual</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Pendiente</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Current Document Details */}
        {currentDocument && !signedDocuments.has(currentDocument.id) && (
          <Card>
            <CardHeader>
              <CardTitle>Documento Actual: {currentDocument.name}</CardTitle>
              <CardDescription>
                Por favor revise el contenido y firme este documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentDocument.content && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{currentDocument.content}</p>
                </div>
              )}
              
              {!showSignatureCanvas ? (
                <Button 
                  className="w-full" 
                  onClick={() => setShowSignatureCanvas(true)}
                  disabled={createSignature.isPending}
                >
                  <PenTool className="mr-2 h-4 w-4" />
                  Firmar Documento
                </Button>
              ) : (
                <SignatureCanvas 
                  onSign={handleSignDocument}
                  disabled={createSignature.isPending}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Completion Message */}
        {allDocumentsSigned && (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">¡Proceso Completado!</h3>
              <p className="text-muted-foreground mb-4">
                Todos los documentos han sido firmados exitosamente.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDownloadSignedDocuments}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Documentos Firmados
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Token de sesión: {token?.slice(0, 8)}...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Esta sesión expira el {new Date(saleData.signature_expires_at || '').toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignatureView;
