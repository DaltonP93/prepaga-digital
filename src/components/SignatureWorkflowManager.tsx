import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, CheckCircle, XCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SignatureWorkflowManagerProps {
  saleId: string;
  currentStatus?: string;
  signatureToken?: string;
  signatureExpiresAt?: string;
}

export const SignatureWorkflowManager = ({
  saleId,
  currentStatus,
  signatureToken,
  signatureExpiresAt
}: SignatureWorkflowManagerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expirationHours, setExpirationHours] = useState(72);
  const { toast } = useToast();

  const generateSignatureLink = async () => {
    setIsGenerating(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      const { error } = await supabase
        .from("sales")
        .update({
          signature_token: token,
          signature_expires_at: expiresAt.toISOString(),
          status: "enviado"
        })
        .eq("id", saleId);

      if (error) throw error;

      toast({
        title: "Enlace generado",
        description: "El enlace de firma ha sido generado exitosamente",
      });

      window.location.reload();
      
    } catch (error) {
      console.error("Error generating signature link:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de firma",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copySignatureLink = () => {
    if (!signatureToken) return;
    
    const link = `${window.location.origin}/signature/${signatureToken}`;
    navigator.clipboard.writeText(link);
    
    toast({
      title: "Enlace copiado",
      description: "El enlace de firma ha sido copiado al portapapeles",
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "borrador":
        return <Badge variant="secondary">Borrador</Badge>;
      case "enviado":
        return <Badge variant="outline">Enviado</Badge>;
      case "firmado":
        return <Badge className="bg-green-500">Firmado</Badge>;
      case "completado":
        return <Badge className="bg-blue-500">Completado</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const isExpired = signatureExpiresAt && new Date(signatureExpiresAt) < new Date();
  const signatureLink = signatureToken ? `${window.location.origin}/signature/${signatureToken}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestión de Firmas</span>
          {getStatusBadge(currentStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!signatureToken ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Horas de expiración</Label>
              <Input
                id="expiration"
                type="number"
                value={expirationHours}
                onChange={(e) => setExpirationHours(Number(e.target.value))}
                min={1}
                max={168}
              />
            </div>
            <Button 
              onClick={generateSignatureLink} 
              disabled={isGenerating}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isGenerating ? "Generando..." : "Generar Enlace de Firma"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Enlace de firma:</p>
              <p className="text-xs break-all text-muted-foreground">{signatureLink}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copySignatureLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Enlace
              </Button>
            </div>

            {signatureExpiresAt && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  {isExpired ? "Expiró" : "Expira"} el{" "}
                  {new Date(signatureExpiresAt).toLocaleString()}
                </span>
                {isExpired && <XCircle className="h-4 w-4 text-red-500" />}
                {!isExpired && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
            )}

            {isExpired && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  El enlace de firma ha expirado. Genera un nuevo enlace para continuar.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};