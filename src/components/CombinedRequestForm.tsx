
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useCreateClient } from '@/hooks/useClients';
import { usePlans } from '@/hooks/usePlans';
import { useTemplateQuestions } from '@/hooks/useTemplateQuestions';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';
import { useCombinedRequest } from '@/hooks/useCombinedRequest';
import { CheckCircle, User, FileText, Signature } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  personal: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni: string;
  };
  health: Record<string, string>;
  plan_id: string;
  signature: string | null;
}

export const CombinedRequestForm = ({ onComplete }: { onComplete?: () => void }) => {
  const [currentTab, setCurrentTab] = useState('personal');
  const [formData, setFormData] = useState<FormData>({
    personal: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      dni: '',
    },
    health: {},
    plan_id: '',
    signature: null,
  });

  const { data: plans } = usePlans();
  const { questions } = useTemplateQuestions('default-health-template');
  const { generatePDF, isGenerating } = usePDFGeneration();
  const { processCombinedRequest, isProcessing } = useCombinedRequest();

  const validateTab = (tab: string): boolean => {
    switch (tab) {
      case 'personal':
        const { first_name, last_name, email, dni } = formData.personal;
        return !!(first_name && last_name && email && dni);
      case 'health':
        return questions?.every(q => q.is_required ? formData.health[q.id] : true) ?? true;
      case 'plan':
        return !!formData.plan_id;
      case 'signature':
        return !!formData.signature;
      default:
        return true;
    }
  };

  const handleTabChange = (newTab: string) => {
    if (validateTab(currentTab)) {
      setCurrentTab(newTab);
    } else {
      toast.error('Complete todos los campos obligatorios antes de continuar');
    }
  };

  const handlePersonalChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  const handleHealthChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      health: { ...prev.health, [questionId]: value }
    }));
  };

  const handleSubmitRequest = async () => {
    if (!validateTab('signature')) {
      toast.error('Complete todos los campos antes de enviar');
      return;
    }

    const result = await processCombinedRequest(formData);
    
    if (result.success) {
      toast.success('Solicitud procesada exitosamente');
      onComplete?.();
    }
  };

  const generateCombinedPDF = async () => {
    const selectedPlan = plans?.find(p => p.id === formData.plan_id);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Contrato y Declaración Jurada</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin: 30px 0; }
            .signature-section { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 30px; }
            .signature-image { max-width: 200px; height: auto; border: 1px solid #ccc; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .question { margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #007bff; }
            .contract-terms { font-size: 12px; color: #555; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CONTRATO DE SEGURO DE SALUD</h1>
            <h2>DECLARACIÓN JURADA INTEGRADA</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          </div>

          <div class="section">
            <h2>I. INFORMACIÓN DEL SOLICITANTE</h2>
            <div class="two-column">
              <div>
                <p><strong>Nombre:</strong> ${formData.personal.first_name} ${formData.personal.last_name}</p>
                <p><strong>DNI:</strong> ${formData.personal.dni}</p>
              </div>
              <div>
                <p><strong>Email:</strong> ${formData.personal.email}</p>
                <p><strong>Teléfono:</strong> ${formData.personal.phone}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>II. PLAN CONTRATADO</h2>
            <p><strong>Plan:</strong> ${selectedPlan?.name || 'Plan seleccionado'}</p>
            <p><strong>Precio:</strong> ${selectedPlan?.price ? `$${Number(selectedPlan.price).toLocaleString()}` : 'Precio del plan'}</p>
            <p><strong>Descripción:</strong> ${selectedPlan?.description || 'Descripción del plan'}</p>
          </div>

          <div class="section">
            <h2>III. DECLARACIÓN JURADA DE SALUD</h2>
            ${questions?.map((q, index) => `
              <div class="question">
                <p><strong>Pregunta ${index + 1}:</strong> ${q.question_text}</p>
                <p><strong>Respuesta:</strong> ${formData.health[q.id] || 'Sin respuesta'}</p>
              </div>
            `).join('') || '<p>No hay preguntas disponibles</p>'}
          </div>

          <div class="signature-section">
            <h2>IV. FIRMA DIGITAL</h2>
            <p><strong>Firmado el:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <div>
              <p><strong>Firma:</strong></p>
              ${formData.signature ? `<img src="${formData.signature}" alt="Firma" class="signature-image" />` : '<p>Sin firma</p>'}
            </div>
            <p style="margin-top: 20px; font-style: italic;">
              Al firmar este documento, acepto los términos y condiciones del plan seleccionado 
              y declaro que toda la información proporcionada es veraz.
            </p>
          </div>

          <div class="contract-terms">
            <h3>TÉRMINOS Y CONDICIONES</h3>
            <p>1. El presente contrato tiene vigencia a partir de la fecha de firma.</p>
            <p>2. La información de la declaración jurada es de carácter confidencial.</p>
            <p>3. Cualquier falsedad en los datos puede resultar en la anulación del contrato.</p>
            <p>4. Este documento ha sido generado digitalmente y es válido sin firma manuscrita adicional.</p>
          </div>
        </body>
      </html>
    `;

    const pdfBlob = await generatePDF({
      htmlContent,
      filename: `contrato-${formData.personal.first_name}-${formData.personal.last_name}`,
      clientData: formData.personal,
      templateData: { name: 'Contrato Integrado' }
    });

    if (pdfBlob) {
      toast.success('Documento generado exitosamente');
      onComplete?.();
    }
  };

  const isTabValid = (tab: string) => validateTab(tab);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Solicitud de Plan de Salud</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Datos Personales
              {isTabValid('personal') && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Declaración Jurada
              {isTabValid('health') && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Plan
              {isTabValid('plan') && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="signature" className="flex items-center gap-2">
              <Signature className="h-4 w-4" />
              Firma
              {isTabValid('signature') && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  value={formData.personal.first_name}
                  onChange={(e) => handlePersonalChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  value={formData.personal.last_name}
                  onChange={(e) => handlePersonalChange('last_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dni">DNI *</Label>
                <Input
                  id="dni"
                  value={formData.personal.dni}
                  onChange={(e) => handlePersonalChange('dni', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.personal.phone}
                  onChange={(e) => handlePersonalChange('phone', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.personal.email}
                  onChange={(e) => handlePersonalChange('email', e.target.value)}
                  required
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-4 mt-6">
            <h3 className="text-lg font-medium mb-4">Declaración Jurada de Salud</h3>
            {questions?.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={question.id}>
                  {question.question_text}
                  {question.is_required && <span className="text-red-500">*</span>}
                </Label>
                {question.question_type === 'yes_no' ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value="Si"
                        checked={formData.health[question.id] === 'Si'}
                        onChange={() => handleHealthChange(question.id, 'Si')}
                      />
                      Sí
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value="No"
                        checked={formData.health[question.id] === 'No'}
                        onChange={() => handleHealthChange(question.id, 'No')}
                      />
                      No
                    </label>
                  </div>
                ) : (
                  <Textarea
                    id={question.id}
                    value={formData.health[question.id] || ''}
                    onChange={(e) => handleHealthChange(question.id, e.target.value)}
                    placeholder="Escriba su respuesta aquí..."
                  />
                )}
              </div>
            )) || <p>Cargando preguntas...</p>}
          </TabsContent>

          <TabsContent value="plan" className="space-y-4 mt-6">
            <h3 className="text-lg font-medium mb-4">Seleccionar Plan</h3>
            <div className="grid gap-4">
              {plans?.map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={formData.plan_id === plan.id}
                      onChange={() => setFormData(prev => ({ ...prev, plan_id: plan.id }))}
                      className="mt-1"
                    />
                    <div>
                      <h4 className="font-medium">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                      <p className="text-lg font-semibold text-primary">
                        ${Number(plan.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </label>
                </div>
              )) || <p>Cargando planes...</p>}
            </div>
          </TabsContent>

          <TabsContent value="signature" className="space-y-4 mt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-4">Revisión y Firma</h3>
              
              <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                <h4 className="font-medium mb-2">Resumen de su solicitud:</h4>
                <p><strong>Solicitante:</strong> {formData.personal.first_name} {formData.personal.last_name}</p>
                <p><strong>Plan:</strong> {plans?.find(p => p.id === formData.plan_id)?.name || 'No seleccionado'}</p>
                <p><strong>Preguntas respondidas:</strong> {Object.keys(formData.health).length} de {questions?.length || 0}</p>
              </div>

              <SignatureCanvas 
                onSignatureChange={(signature) => setFormData(prev => ({ ...prev, signature }))}
                width={400}
                height={200}
              />

              <div className="flex gap-4 mt-4">
                <Button 
                  onClick={generateCombinedPDF}
                  disabled={!validateTab('signature') || isGenerating}
                  variant="outline"
                >
                  {isGenerating ? 'Generando vista previa...' : 'Vista Previa PDF'}
                </Button>
                
                <Button 
                  onClick={handleSubmitRequest}
                  disabled={!validateTab('signature') || isProcessing}
                >
                  {isProcessing ? 'Procesando solicitud...' : 'Enviar Solicitud'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
