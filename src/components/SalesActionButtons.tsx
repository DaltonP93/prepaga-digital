
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  FileSignature, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw
} from "lucide-react";
import { useGenerateQuestionnaireLink, useGenerateSignatureLink } from "@/hooks/useSales";
import { useToast } from "@/hooks/use-toast";

interface Sale {
  id: string;
  status: string;
  template_id?: string;
  signature_token?: string;
  signature_expires_at?: string;
  clients?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  plans?: {
    name: string;
    price: number;
  };
  template_responses?: Array<{ id: string }>;
}

interface SalesActionButtonsProps {
  sale: Sale;
}

export const SalesActionButtons: React.FC<SalesActionButtonsProps> = ({ sale }) => {
  const { toast } = useToast();
  const generateQuestionnaireLink = useGenerateQuestionnaireLink();
  const generateSignatureLink = useGenerateSignatureLink();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "borrador":
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Borrador
        </Badge>;
      case "enviado":
        return <Badge variant="outline" className="flex items-center gap-1">
          <Send className="h-3 w-3" />
          Enviado
        </Badge>;
      case "firmado":
        return <Badge className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Firmado
        </Badge>;
      case "completado":
        return <Badge className="bg-blue-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Completado
        </Badge>;
      case "cancelado":
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Cancelado
        </Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const handleGenerateQuestionnaire = async () => {
    try {
      await generateQuestionnaireLink.mutateAsync(sale.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el enlace del cuestionario",
        variant: "destructive"
      });
    }
  };

  const handleGenerateSignature = async () => {
    try {
      await generateSignatureLink.mutateAsync(sale.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el enlace de firma",
        variant: "destructive"
      });
    }
  };

  const copySignatureLink = () => {
    if (sale.signature_token) {
      const link = `${window.location.origin}/signature/${sale.signature_token}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Enlace copiado",
        description: "El enlace de firma ha sido copiado al portapapeles"
      });
    }
  };

  const isTokenExpired = sale.signature_expires_at && new Date(sale.signature_expires_at) < new Date();
  const hasActiveToken = sale.signature_token && !isTokenExpired;
  const hasTemplate = !!sale.template_id;
  const hasQuestionnaireResponses = sale.template_responses && sale.template_responses.length > 0;
  const readyForSignature = !hasTemplate || hasQuestionnaireResponses;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Estado del Proceso</h4>
        {getStatusBadge(sale.status)}
      </div>

      {/* Información del cliente y plan */}
      {sale.clients && (
        <div className="text-sm text-muted-foreground">
          <p><strong>Cliente:</strong> {sale.clients.first_name} {sale.clients.last_name}</p>
          <p><strong>Email:</strong> {sale.clients.email}</p>
        </div>
      )}

      {sale.plans && (
        <div className="text-sm text-muted-foreground">
          <p><strong>Plan:</strong> {sale.plans.name}</p>
          <p><strong>Precio:</strong> {sale.plans.price?.toLocaleString()} Gs.</p>
        </div>
      )}

      {/* Acciones según el estado */}
      <div className="space-y-2">
        {hasTemplate && !hasQuestionnaireResponses && (
          <div className="space-y-2">
            <p className="text-sm text-amber-600">
              Se requiere completar el cuestionario antes de la firma
            </p>
            <Button 
              onClick={handleGenerateQuestionnaire}
              disabled={generateQuestionnaireLink.isPending}
              className="w-full"
            >
              {generateQuestionnaireLink.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generar Enlace Cuestionario
                </>
              )}
            </Button>
          </div>
        )}

        {readyForSignature && (
          <div className="space-y-2">
            {!hasActiveToken ? (
              <Button 
                onClick={handleGenerateSignature}
                disabled={generateSignatureLink.isPending}
                className="w-full"
              >
                {generateSignatureLink.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Generar Enlace de Firma
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  ✅ Enlace de firma activo
                </p>
                <Button 
                  onClick={copySignatureLink}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Enlace de Firma
                </Button>
                {isTokenExpired && (
                  <p className="text-xs text-red-600">
                    ⚠️ El enlace ha expirado
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {sale.status === 'firmado' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              ✅ Documento firmado exitosamente
            </p>
            <p className="text-xs text-green-600 mt-1">
              El proceso de firma ha sido completado
            </p>
          </div>
        )}

        {sale.status === 'completado' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              ✅ Proceso completado
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Todos los documentos han sido procesados
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesActionButtons;
