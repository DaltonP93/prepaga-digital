
import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

type SaleStatus = Database['public']['Enums']['sale_status'];

interface Sale {
  id: string;
  status: SaleStatus;
  signature_token: string;
  signature_expires_at: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

const SignatureWorkflow = () => {
  const { token } = useParams();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadSaleByToken(token);
    }
  }, [token]);

  const loadSaleByToken = async (signatureToken: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('signature_token', signatureToken)
        .single();

      if (error) {
        console.error('Error loading sale:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la venta",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "Error", 
          description: "Venta no encontrada",
          variant: "destructive",
        });
        return;
      }

      // Check if token is expired
      if (new Date(data.signature_expires_at) < new Date()) {
        toast({
          title: "Token Expirado",
          description: "El enlace de firma ha expirado",
          variant: "destructive",
        });
        return;
      }

      setSale(data);
      
      // Set current step based on status
      if (data.status === 'borrador') {
        setCurrentStep(0);
      } else if (data.status === 'enviado') {
        setCurrentStep(1);
      } else if (data.status === 'firmado' || data.status === 'completado') {
        setCurrentStep(2);
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar la venta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async () => {
    if (!sale) return;

    try {
      let newStatus: SaleStatus = sale.status;
      
      if (currentStep === 0) {
        newStatus = 'enviado';
      } else if (currentStep === 1) {
        newStatus = 'firmado';
      } else if (currentStep === 2) {
        newStatus = 'completado';
      }

      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('id', sale.id);

      if (error) {
        throw error;
      }

      setSale({ ...sale, status: newStatus });
      
      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      }

      toast({
        title: "Paso Completado",
        description: `Paso ${currentStep + 1} completado exitosamente`,
      });

    } catch (error) {
      console.error('Error updating sale status:', error);
      toast({
        title: "Error",
        description: "No se pudo completar el paso",
        variant: "destructive",
      });
    }
  };

  if (!token) {
    return <Navigate to="/404" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando flujo de firma...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No se pudo cargar la información del proceso de firma.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: SaleStatus) => {
    const statusConfig = {
      borrador: { label: 'Borrador', variant: 'secondary' as const },
      pendiente: { label: 'Pendiente', variant: 'secondary' as const },
      enviado: { label: 'Enviado', variant: 'default' as const },
      firmado: { label: 'Firmado', variant: 'default' as const },
      completado: { label: 'Completado', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
      en_auditoria: { label: 'En Auditoría', variant: 'secondary' as const },
    };
    const config = statusConfig[status] || statusConfig.borrador;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Simple placeholder components for missing dependencies
  const DocumentPreview = ({ saleId }: { saleId: string }) => (
    <div className="p-4 border rounded-lg">
      <p className="text-muted-foreground">Documentos para la venta: {saleId}</p>
      <p className="text-sm text-muted-foreground mt-2">Vista previa de documentos no disponible</p>
    </div>
  );

  const SignatureCanvas = ({ saleId, onSignatureComplete }: { saleId: string; onSignatureComplete: () => void }) => (
    <div className="p-4 border rounded-lg">
      <p className="text-muted-foreground mb-4">Canvas de firma para la venta: {saleId}</p>
      <Button onClick={onSignatureComplete} className="w-full">
        Simular Firma Completada
      </Button>
    </div>
  );

  const QuestionnaireViewPlaceholder = ({ saleId }: { saleId: string }) => (
    <div className="p-4 border rounded-lg">
      <p className="text-muted-foreground mb-4">Cuestionario para la venta: {saleId}</p>
      <p className="text-sm text-muted-foreground">Componente de cuestionario no disponible</p>
      <Button onClick={handleStepComplete} className="w-full mt-4">
        Completar Cuestionario
      </Button>
    </div>
  );

  const steps = [
    {
      title: "Cuestionario",
      description: "Complete la información requerida",
      icon: <FileText className="h-5 w-5" />,
      component: <QuestionnaireViewPlaceholder saleId={sale?.id || ''} />,
      completed: sale?.status !== 'borrador'
    },
    {
      title: "Revisión de Documentos",  
      description: "Revise los documentos generados",
      icon: <FileText className="h-5 w-5" />,
      component: <DocumentPreview saleId={sale?.id || ''} />,
      completed: sale?.status === 'firmado' || sale?.status === 'completado'
    },
    {
      title: "Firma Digital",
      description: "Firme digitalmente los documentos",
      icon: <CheckCircle className="h-5 w-5" />,
      component: <SignatureCanvas saleId={sale?.id || ''} onSignatureComplete={handleStepComplete} />,
      completed: sale?.status === 'firmado' || sale?.status === 'completado'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Proceso de Firma</h1>
            {getStatusBadge(sale.status)}
          </div>
          <p className="text-muted-foreground">
            Complete los siguientes pasos para finalizar el proceso de firma digital.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2
                  ${index <= currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {step.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {steps[currentStep]?.icon}
              {steps[currentStep]?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {steps[currentStep]?.component}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Anterior
          </Button>
          <Button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1 || !steps[currentStep]?.completed}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignatureWorkflow;
