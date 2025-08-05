

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

interface CombinedRequestData {
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

export const useCombinedRequest = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { generatePDF } = usePDFGeneration();

  const processCombinedRequest = async (data: CombinedRequestData) => {
    setIsProcessing(true);
    
    try {
      // 1. Crear cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(data.personal)
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Crear venta - using correct property names from sales table schema
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          client_id: client.id,
          plan_id: data.plan_id,
          status: 'borrador', // Using the correct default status from schema
          signature_token: generateSignatureToken(),
          signature_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Convert to string
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 3. Guardar respuestas de declaración jurada
      if (Object.keys(data.health).length > 0) {
        const responses = Object.entries(data.health).map(([question_id, response_value]) => ({
          template_id: 'default-health-template',
          question_id,
          client_id: client.id,
          sale_id: sale.id,
          response_value,
        }));

        const { error: responsesError } = await supabase
          .from('template_responses')
          .insert(responses);

        if (responsesError) throw responsesError;
      }

      // 4. Si hay firma, crear registro de firma
      if (data.signature) {
        const { error: signatureError } = await supabase
          .from('signatures')
          .insert({
            sale_id: sale.id,
            signature_data: data.signature,
            status: 'firmado',
          });

        if (signatureError) throw signatureError;
      }

      toast({
        title: 'Solicitud procesada',
        description: 'La solicitud ha sido creada exitosamente.',
      });

      return { success: true, sale, client };

    } catch (error: any) {
      console.error('Error processing combined request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar la solicitud.',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSignatureToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  return {
    processCombinedRequest,
    isProcessing,
  };
};

