
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Copy, 
  AlertTriangle,
  RefreshCw,
  Ban
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SignatureWorkflowManagerProps {
  saleId: string;
  currentStatus?: string;
  signatureToken?: string;
  signatureExpiresAt?: string;
  tokenRevoked?: boolean;
  tokenRevokedAt?: string;
  tokenRevokedBy?: string;
}

export const SignatureWorkflowManager = ({
  saleId,
  currentStatus,
  signatureToken,
  signatureExpiresAt,
  tokenRevoked,
  tokenRevokedAt,
  tokenRevokedBy
}: SignatureWorkflowManagerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [expirationHours, setExpirationHours] = useState(72);
  const [revocationReason, setRevocationReason] = useState("");
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
          status: "enviado",
          token_revoked: false,
          token_revoked_at: null,
          token_revoked_by: null
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

  const revokeSignatureToken = async () => {
    if (!revocationReason.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una razón para la revocación",
        variant: "destructive"
      });
      return;
    }

    setIsRevoking(true);
    try {
      const { error } = await supabase.rpc('revoke_signature_token', {
        p_sale_id: saleId,
        p_reason: revocationReason
      });

      if (error) throw error;

      toast({
        title: "Token revocado",
        description: "El token de firma ha sido revocado exitosamente",
      });

      setRevocationReason("");
      window.location.reload();
      
    } catch (error) {
      console.error("Error revoking token:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo revocar el token",
        variant: "destructive"
      });
    } finally {
      setIsRevoking(false);
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
  const isTokenRevoked = tokenRevoked === true;
  const canUseToken = signatureToken && !isExpired && !isTokenRevoked;
  const signatureLink = signatureToken ? `${window.location.origin}/signature/${signatureToken}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestión de Firmas</span>
          <div className="flex items-center gap-2">
            {getStatusBadge(currentStatus)}
            {isTokenRevoked && <Badge variant="destructive" className="flex items-center gap-1">
              <Ban className="h-3 w-3" />
              Token Revocado
            </Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!signatureToken || isTokenRevoked ? (
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
              {isTokenRevoked ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isGenerating ? "Regenerando..." : "Regenerar Enlace de Firma"}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generando..." : "Generar Enlace de Firma"}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Enlace de firma:</p>
              <p className="text-xs break-all text-muted-foreground">{signatureLink}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copySignatureLink}
                disabled={!canUseToken}
              >
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
                {isExpired ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            )}

            {isExpired && !isTokenRevoked && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  El enlace de firma ha expirado. Genera un nuevo enlace para continuar.
                </AlertDescription>
              </Alert>
            )}

            {isTokenRevoked && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertDescription>
                  Token revocado {tokenRevokedAt && `el ${new Date(tokenRevokedAt).toLocaleString()}`}.
                  El enlace ya no es válido.
                </AlertDescription>
              </Alert>
            )}

            {canUseToken && (
              <div className="space-y-3 pt-4 border-t">
                <Label htmlFor="revocation-reason" className="text-sm font-medium text-red-600">
                  Revocar token de firma
                </Label>
                <Input
                  id="revocation-reason"
                  placeholder="Razón para revocar el token..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                />
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={revokeSignatureToken}
                  disabled={isRevoking || !revocationReason.trim()}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {isRevoking ? "Revocando..." : "Revocar Token"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
