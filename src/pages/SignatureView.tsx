import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, FileText } from "lucide-react";

export default function SignatureView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaleData = async () => {
      if (!token) {
        setError("Token de firma no válido");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("sales")
          .select(`
            *,
            clients (*),
            plans (*),
            companies (*)
          `)
          .eq("signature_token", token)
          .gt("signature_expires_at", new Date().toISOString())
          .single();

        if (error || !data) {
          setError("Enlace de firma inválido o expirado");
          return;
        }

        setSale(data);
      } catch (err) {
        console.error("Error fetching sale:", err);
        setError("Error al cargar los datos de la venta");
      } finally {
        setLoading(false);
      }
    };

    fetchSaleData();
  }, [token]);

  const handleSign = async () => {
    if (!signatureData || !sale) return;

    setSigning(true);
    try {
      // Crear registro de firma
      const { error: signatureError } = await supabase
        .from("signatures")
        .insert({
          sale_id: sale.id,
          signature_data: signatureData,
          ip_address: null,
          user_agent: navigator.userAgent,
          status: "firmado"
        });

      if (signatureError) throw signatureError;

      // Actualizar estado de la venta
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          status: "firmado",
          signature_token: null
        })
        .eq("id", sale.id);

      if (saleError) throw saleError;

      toast({
        title: "Documento firmado",
        description: "Su firma ha sido registrada exitosamente",
      });

      navigate("/");

    } catch (error) {
      console.error("Error signing document:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la firma",
        variant: "destructive"
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando documento...</p>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Firma de Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Datos del Cliente</h3>
                <p>{sale.clients?.first_name} {sale.clients?.last_name}</p>
                <p className="text-sm text-muted-foreground">{sale.clients?.email}</p>
              </div>
              <div>
                <h3 className="font-semibold">Plan</h3>
                <p>{sale.plans?.name}</p>
                <p className="text-sm text-muted-foreground">${sale.plans?.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documento a firmar */}
        <Card>
          <CardHeader>
            <CardTitle>Documento del Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">
                CONTRATO DE SEGURO
                
                Cliente: {sale.clients?.first_name} {sale.clients?.last_name}
                DNI: {sale.clients?.dni}
                Plan: {sale.plans?.name}
                Monto: ${sale.plans?.price}
                
                Por medio del presente documento, el cliente acepta los términos y condiciones...
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Canvas de firma */}
        <div className="flex justify-center">
          <SignatureCanvas onSignatureChange={setSignatureData} />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleSign}
            disabled={!signatureData || signing}
            size="lg"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {signing ? "Firmando..." : "Firmar Documento"}
          </Button>
        </div>

        {/* Footer legal */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground text-center">
              Al firmar este documento, usted acepta todos los términos y condiciones establecidos.
              Esta firma tiene validez legal según las normativas vigentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}