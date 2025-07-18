import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleInsert = Database['public']['Tables']['sales']['Insert'];
type SaleUpdate = Database['public']['Tables']['sales']['Update'];

export const useSales = () => {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, email, phone, dni),
          plans:plan_id(name, price, description, coverage_details),
          salesperson:salesperson_id(first_name, last_name, email),
          companies:company_id(name),
          templates:template_id(name, description)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateSale = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: SaleInsert) => {
      const { data, error } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Venta creada",
        description: "La venta ha sido creada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la venta.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSale = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SaleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Venta actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la venta.",
        variant: "destructive",
      });
    },
  });
};

export const useGenerateQuestionnaireLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // First get the sale to check if it has a template
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, email),
          templates:template_id(name, question_count:template_questions(count))
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;
      
      if (!sale.template_id) {
        throw new Error('Esta venta no tiene un cuestionario asociado. Asigne un template primero.');
      }

      // Generate or reuse existing token
      let token = sale.signature_token;
      let expiresAtString = sale.signature_expires_at;

      if (!token || !expiresAtString || new Date(expiresAtString) < new Date()) {
        token = crypto.randomUUID();
        const expiresAtDate = new Date();
        expiresAtDate.setDate(expiresAtDate.getDate() + 7); // Expires in 7 days
        expiresAtString = expiresAtDate.toISOString();

        const { error: updateError } = await supabase
          .from('sales')
          .update({
            signature_token: token,
            signature_expires_at: expiresAtString,
            status: 'enviado'
          })
          .eq('id', saleId);

        if (updateError) throw updateError;
      }
      
      const questionnaireUrl = `${window.location.origin}/questionnaire/${token}`;
      
      return { sale, questionnaireUrl, token };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      
      // Copy to clipboard
      navigator.clipboard.writeText(data.questionnaireUrl);
      
      toast({
        title: "Enlace del cuestionario generado",
        description: "El enlace ha sido copiado al portapapeles y está listo para enviar al cliente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el enlace del cuestionario.",
        variant: "destructive",
      });
    },
  });
};

export const useGenerateSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // Check if questionnaire needs to be completed first
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, email, phone),
          plans:plan_id(name, price),
          profiles:salesperson_id(first_name, last_name, email),
          templates:template_id(name),
          template_responses(id)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      // If there's a template but no responses, require questionnaire completion
      if (sale.template_id && (!sale.template_responses || sale.template_responses.length === 0)) {
        throw new Error('El cliente debe completar el cuestionario antes de firmar. Genere y envíe primero el enlace del cuestionario.');
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { data: updatedSale, error } = await supabase
        .from('sales')
        .update({
          signature_token: token,
          signature_expires_at: expiresAt.toISOString(),
          status: 'enviado'
        })
        .eq('id', saleId)
        .select(`
          *,
          clients:client_id(first_name, last_name, email, phone),
          plans:plan_id(name, price),
          profiles:salesperson_id(first_name, last_name, email)
        `)
        .single();

      if (error) throw error;
      
      const signatureUrl = `${window.location.origin}/signature/${token}`;
      
      return { sale: updatedSale, signatureUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      
      // Copy to clipboard
      navigator.clipboard.writeText(data.signatureUrl);
      
      toast({
        title: "Enlace de firma generado",
        description: "El enlace ha sido copiado al portapapeles. Envíelo al cliente para que complete la firma.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el enlace de firma.",
        variant: "destructive",
      });
    },
  });
};

// Nueva función para validar el estado de una venta antes de generar enlaces
export const useValidateSaleForSignature = () => {
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: sale, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, email),
          plans:plan_id(name, price),
          templates:template_id(name),
          template_responses(id)
        `)
        .eq('id', saleId)
        .single();

      if (error) throw error;

      const validation = {
        hasClient: !!sale.client_id,
        hasPlan: !!sale.plan_id,
        hasTemplate: !!sale.template_id,
        hasQuestionnaireResponses: sale.template_responses && sale.template_responses.length > 0,
        readyForQuestionnaire: !!sale.client_id && !!sale.plan_id && !!sale.template_id,
        readyForSignature: !!sale.client_id && !!sale.plan_id && (!sale.template_id || (sale.template_responses && sale.template_responses.length > 0))
      };

      return { sale, validation };
    }
  });
};
