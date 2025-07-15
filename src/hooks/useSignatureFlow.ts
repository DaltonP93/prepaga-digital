
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

      // 2. Generar PDF con firma
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
      };

      const htmlContent = generatePDFContent(pdfData);
      
      // 3. Generar PDF usando edge function
      const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: {
          htmlContent,
          filename: `Contrato-${saleData.clients?.first_name}-${saleData.clients?.last_name}.pdf`
        }
      });

      if (pdfError) throw pdfError;

      // 4. Subir PDF a Storage
      const fileName = `contracts/${saleData.id}-signed.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 5. Actualizar venta con URL del documento firmado
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          signed_document_url: fileName,
          status: 'firmado'
        })
        .eq('id', saleData.id);

      if (updateError) throw updateError;

      // 6. Completar el proceso de firma
      await completeSignature.mutateAsync(saleData.id);

      toast({
        title: "Proceso completado",
        description: "El documento ha sido firmado y guardado exitosamente.",
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
