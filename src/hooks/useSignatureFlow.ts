
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateSignature, useCompleteSignature } from '@/hooks/useSignature';
import { generatePDFContent } from '@/lib/pdfGenerator';
import { createTemplateContext, interpolateTemplate } from '@/lib/templateEngine';

export const useSignatureFlow = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const createSignature = useCreateSignature();
  const completeSignature = useCompleteSignature();

  const processSignature = async (
    saleData: any,
    signatureData: string,
    documentId: string
  ) => {
    setIsProcessing(true);
    try {
      // 1. Guardar la firma
      await createSignature.mutateAsync({
        saleId: saleData.id,
        documentId: documentId,
        signatureData: signatureData,
      });

      // 2. Obtener respuestas del cuestionario si existe template
      let questionnaireResponses = {};
      if (saleData.template_id) {
        const { data: responses, error: responsesError } = await supabase
          .from('template_responses')
          .select(`
            question_id,
            response_value,
            template_questions!inner(question_text, question_type)
          `)
          .eq('template_id', saleData.template_id)
          .eq('client_id', saleData.client_id);

        if (!responsesError && responses) {
          questionnaireResponses = responses.reduce((acc, response) => {
            acc[response.question_id] = {
              question: response.template_questions.question_text,
              answer: response.response_value,
              question_type: response.template_questions.question_type
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 3. Generar PDF con firma y respuestas del cuestionario
      const pdfData = {
        content: saleData.documents?.[0]?.content || '',
        signatures: [{
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          document_id: documentId,
        }],
        client: saleData.clients,
        plan: saleData.plans,
        company: { name: 'Mi Empresa' }, // TODO: Get from company data
        questionnaire_responses: questionnaireResponses,
      };

      const htmlContent = generatePDFContent(pdfData);
      
      // 4. Generar PDF usando edge function
      const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: {
          htmlContent,
          filename: `Contrato-${saleData.clients?.first_name}-${saleData.clients?.last_name}.pdf`
        }
      });

      if (pdfError) throw pdfError;

      // 5. Subir PDF a Storage
      const fileName = `contracts/${saleData.id}-signed.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 6. Actualizar venta con URL del documento firmado
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          signed_document_url: fileName,
          status: 'firmado'
        })
        .eq('id', saleData.id);

      if (updateError) throw updateError;

      // 7. Completar el proceso de firma
      await completeSignature.mutateAsync(saleData.id);

      toast({
        title: "Proceso completado",
        description: "El documento ha sido firmado y guardado exitosamente con las respuestas del cuestionario incluidas.",
      });

      return { success: true, documentUrl: fileName };
    } catch (error: any) {
      console.error('Error en proceso de firma:', error);
      toast({
        title: "Error",
        description: error.message || "Error al procesar la firma.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processSignature,
    isProcessing,
  };
};
