import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  name: string;
  trigger: 'sale_created' | 'signature_expired' | 'signature_pending' | 'daily_reminder';
  conditions: any;
  actions: Array<{
    type: 'send_email' | 'send_sms' | 'generate_document' | 'create_reminder';
    config: any;
  }>;
  active: boolean;
  created_at: string;
}

export const useSignatureAutomation = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Automatización para envío de recordatorios
  const sendAutomaticReminders = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      // Buscar ventas con firmas pendientes próximas a expirar
      const { data: pendingSales, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (*),
          plans (*)
        `)
        .eq('status', 'enviado')
        .not('signature_token', 'is', null)
        .gte('signature_expires_at', new Date().toISOString())
        .lte('signature_expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); // Próximas 24 horas

      if (error) throw error;

      // Enviar recordatorios
      const results = await Promise.allSettled(
        pendingSales.map(async (sale) => {
          return supabase.functions.invoke('send-notification', {
            body: {
              type: 'signature_reminder',
              to: sale.clients.email,
              data: {
                clientName: `${sale.clients.first_name} ${sale.clients.last_name}`,
                planName: sale.plans.name,
                signatureUrl: `${window.location.origin}/signature/${sale.signature_token}`,
                expiresAt: sale.signature_expires_at,
                hoursLeft: Math.ceil((new Date(sale.signature_expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
              }
            }
          });
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      return { successful, failed, total: pendingSales.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Recordatorios enviados",
        description: `${data.successful} recordatorios enviados exitosamente. ${data.failed} fallaron.`
      });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error enviando recordatorios",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Automatización para reenvío de enlaces expirados
  const resendExpiredSignatures = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);

      // Buscar ventas con firmas expiradas en las últimas 24 horas
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: expiredSales, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (*),
          plans (*)
        `)
        .eq('status', 'enviado')
        .not('signature_token', 'is', null)
        .lt('signature_expires_at', new Date().toISOString())
        .gte('signature_expires_at', oneDayAgo.toISOString());

      if (error) throw error;

      // Generar nuevos tokens y reenviar
      const results = await Promise.allSettled(
        expiredSales.map(async (sale) => {
          // Generar nuevo token (válido por 7 días)
          const newToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          // Actualizar venta con nuevo token
          const { error: updateError } = await supabase
            .from('sales')
            .update({
              signature_token: newToken,
              signature_expires_at: expiresAt.toISOString()
            })
            .eq('id', sale.id);

          if (updateError) throw updateError;

          // Enviar nueva notificación
          return supabase.functions.invoke('send-notification', {
            body: {
              type: 'signature_request',
              to: sale.clients.email,
              data: {
                clientName: `${sale.clients.first_name} ${sale.clients.last_name}`,
                planName: sale.plans.name,
                signatureUrl: `${window.location.origin}/signature/${newToken}`,
                expiresAt: expiresAt.toISOString()
              }
            }
          });
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      return { successful, failed: results.length - successful, total: expiredSales.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Enlaces renovados",
        description: `${data.successful} enlaces de firma renovados y reenviados.`
      });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error renovando enlaces",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Automatización para generación masiva de documentos
  const generateBulkDocuments = useMutation({
    mutationFn: async (saleIds: string[]) => {
      setIsProcessing(true);

      const results = await Promise.allSettled(
        saleIds.map(async (saleId) => {
          // Obtener datos de la venta
          const { data: sale, error } = await supabase
            .from('sales')
            .select(`
              *,
              clients (*),
              plans (*),
              companies (*),
              templates (*)
            `)
            .eq('id', saleId)
            .single();

          if (error) throw error;

          // Generar documento usando el template
          if (sale.templates) {
            const documentContent = `
              <div class="section">
                <h2>CONTRATO DE SEGURO</h2>
                <div class="client-info">
                  <h3>Datos del Cliente</h3>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Nombre:</span>
                      <span class="info-value">${sale.clients.first_name} ${sale.clients.last_name}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Email:</span>
                      <span class="info-value">${sale.clients.email}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Plan:</span>
                      <span class="info-value">${sale.plans.name}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Precio:</span>
                      <span class="info-value">$${sale.plans.price}</span>
                    </div>
                  </div>
                </div>
                
                <div class="section">
                  <h3>Términos y Condiciones</h3>
                  <p>${sale.plans.description || 'Términos estándar del contrato de seguro.'}</p>
                  
                  <div class="highlight">
                    <strong>Cobertura:</strong> ${sale.plans.coverage_details || 'Cobertura estándar según plan seleccionado.'}
                  </div>
                </div>
              </div>
            `;

            // Generar PDF
            return supabase.functions.invoke('generate-pdf', {
              body: {
                htmlContent: documentContent,
                filename: `contrato_${sale.clients.first_name}_${sale.clients.last_name}_${Date.now()}.pdf`,
                saleId: saleId,
                documentType: 'contract'
              }
            });
          }

          throw new Error('No template found for sale');
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      return { successful, failed: results.length - successful, total: saleIds.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Documentos generados",
        description: `${data.successful} documentos generados exitosamente.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error generando documentos",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Configurar automatización programada
  const scheduleAutomation = useMutation({
    mutationFn: async (rule: Partial<AutomationRule>) => {
      // Por ahora guardamos las reglas en localStorage hasta crear la tabla
      const existingRules = JSON.parse(localStorage.getItem('automation_rules') || '[]');
      const newRule = {
        ...rule,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        active: true
      };
      
      existingRules.push(newRule);
      localStorage.setItem('automation_rules', JSON.stringify(existingRules));
      
      return newRule;
    },
    onSuccess: () => {
      toast({
        title: "Automatización configurada",
        description: "La regla de automatización ha sido creada exitosamente."
      });
    }
  });

  return {
    sendAutomaticReminders,
    resendExpiredSignatures, 
    generateBulkDocuments,
    scheduleAutomation,
    isProcessing
  };
};