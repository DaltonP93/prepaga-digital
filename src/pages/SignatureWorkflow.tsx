
import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SignatureCanvas from "@/components/SignatureCanvas";
import DocumentPreview from "@/components/DocumentPreview";
import QuestionnaireView from "@/pages/QuestionnaireView";

interface Sale {
  id: string;
  status: 'borrador' | 'pendiente' | 'enviado' | 'firmado' | 'completado' | 'cancelado' | 'en_auditoria';
  signature_token: string;
  signature_expires_at: string;
  client_id: string;
  clients: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const SignatureWorkflow = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      if (!token) {
        setError("Token de firma no válido");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id,
            status,
            signature_token,
            signature_expires_at,
            client_id,
            clients!inner (
              first_name,
              last_name,
              email
            )
          `)
          .eq('signature_token', token)
          .single();

        if (error) throw error;

        if (!data) {
          setError("Venta no encontrada");
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (new Date(data.signature_expires_at) < new Date()) {
          setError("El enlace de firma ha expirado");
          setLoading(false);
          return;
        }

        setSale(data);
        
        // Determine current step based on sale status
        if (data.status === 'borrador') {
          setCurrentStep(0);
        } else if (data.status === 'enviado') {
          setCurrentStep(1);
        } else if (data.status === 'firmado') {
          setCurrentStep(2);
        }
        
      } catch (error: any) {
        console.error('Error fetching sale:', error);
        setError(error.message || "Error al cargar la información de la venta");
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [token]);

  const handleStepComplete = async () => {
    if (!sale) return;

    try {
      let newStatus: Sale['status'] = sale.status;
      
      if (currentStep === 0) {
        newStatus = 'enviado';
      } else if (currentStep === 1) {
        newStatus = 'firmado';
      }

      const { error } = await supabase
        .from('sales')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', sale.id);

      if (error) throw error;

      setSale({ ...sale, status: newStatus });
      
      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      }

      toast({
        title: "Paso completado",
        description: "Has avanzado al siguiente paso del proceso de firma.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar el paso.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Cargando proceso de firma...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span>Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.close()} variant="outline" className="w-full">
              Cerrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: Sale['status']) => {
    const statusConfig = {
      borrador: { label: 'Borrador', variant: 'secondary' as const },
      pendiente: { label: 'Pendiente', variant: 'secondary' as const },
      enviado: { label: 'Enviado', variant: 'default' as const },
      firmado: { label: 'Firmado', variant: 'default' as const },
      completado: { label: 'Completado', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
      en_auditoria: { label: 'En Auditoría', variant: 'secondary' as const }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const steps = [
    {
      title: "Cuestionario",
      description: "Complete la información requerida",
      icon: <FileText className="h-5 w-5" />,
      component: <QuestionnaireView saleId={sale.id} />,
      completed: sale.status !== 'borrador'
    },
    {
      title: "Revisión de Documentos",  
      description: "Revise los documentos generados",
      icon: <FileText className="h-5 w-5" />,
      component: <DocumentPreview saleId={sale.id} />,
      completed: sale.status === 'firmado' || sale.status === 'completado'
    },
    {
      title: "Firma Digital",
      description: "Firme digitalmente los documentos",
      icon: <CheckCircle className="h-5 w-5" />,
      component: <SignatureCanvas saleId={sale.id} onSignatureComplete={handleStepComplete} />,
      completed: sale.status === 'firmado' || sale.status === 'completado'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Proceso de Firma Digital</CardTitle>
                <p className="text-muted-foreground">
                  Cliente: {sale.clients.first_name} {sale.clients.last_name}
                </p>
              </div>
              {getStatusBadge(sale.status)}
            </div>
          </CardHeader>
        </Card>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4 mb-6">
              {steps.map((step, index) => (
                <React.Fragment key={index}>
                  <div className={`flex items-center space-x-2 ${
                    index === currentStep ? 'text-primary' : 
                    step.completed ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`p-2 rounded-full border-2 ${
                      index === currentStep ? 'border-primary bg-primary/10' :
                      step.completed ? 'border-green-600 bg-green-100' : 'border-muted'
                    }`}>
                      {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px ${
                      step.completed ? 'bg-green-600' : 'bg-muted'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {steps[currentStep]?.icon}
              <span>{steps[currentStep]?.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {steps[currentStep]?.component}
            
            {currentStep < 2 && !steps[currentStep].completed && (
              <div className="mt-6 flex justify-end">
                <Button onClick={handleStepComplete}>
                  Continuar al siguiente paso
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignatureWorkflow;
