
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRealTimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const invalidateTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
    const scheduleInvalidate = (key: string, queryKey: string[], delay = 250) => {
      const existingTimeout = invalidateTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const nextTimeout = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        invalidateTimeouts.delete(key);
      }, delay);

      invalidateTimeouts.set(key, nextTimeout);
    };

    const channel = supabase
      .channel('realtime-all-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          scheduleInvalidate('notifications', ['notifications'], 100);
          const n = payload.new as any;
          toast({
            title: n.title || 'Nueva notificación',
            description: n.message || '',
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          const saleId = (payload.new as any)?.id || (payload.old as any)?.id;
          scheduleInvalidate('sales', ['sales']);
          scheduleInvalidate('sales-list', ['sales-list']);
          scheduleInvalidate('sales-lookup', ['sales-lookup']);
          scheduleInvalidate('dashboard-stats', ['dashboard-stats']);
          if (saleId) {
            scheduleInvalidate(`sale-${saleId}`, ['sale', saleId]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          const doc = (payload.new as any) || (payload.old as any);
          const documentId = doc?.id;
          scheduleInvalidate('documents', ['documents']);
          scheduleInvalidate('documents-list', ['documents-list']);
          scheduleInvalidate('sales-document-counts', ['sales-document-counts']);
          queryClient.invalidateQueries({ queryKey: ['sale-generated-documents'], exact: false });
          if (doc?.sale_id) {
            queryClient.invalidateQueries({ queryKey: ['sale-generated-documents', doc.sale_id] });
            queryClient.invalidateQueries({ queryKey: ['signature-link-documents'], exact: false });
          }
          if (documentId) {
            scheduleInvalidate(`document-${documentId}`, ['document', documentId]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signature_links' },
        (payload) => {
          const link = (payload.new as any) || (payload.old as any);
          scheduleInvalidate('signature-links', ['signature-links']);
          scheduleInvalidate('all-signature-links-public', ['all-signature-links-public']);
          if (link?.sale_id) {
            scheduleInvalidate(`signature-links-${link.sale_id}`, ['signature-links', link.sale_id]);
            scheduleInvalidate('sales-list-from-signature', ['sales-list']);
            scheduleInvalidate(`sale-from-signature-${link.sale_id}`, ['sale', link.sale_id]);
          }
          // Notify on completion
          if (link?.status === 'completado' && (payload.old as any)?.status !== 'completado') {
            toast({
              title: '¡Firma completada!',
              description: `Se ha completado una firma para el contrato.`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signature_workflow_steps' },
        () => {
          scheduleInvalidate('signature-workflow-steps', ['signature-workflow-steps']);
          scheduleInvalidate('signature-links-from-steps', ['signature-links']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beneficiaries' },
        () => {
          scheduleInvalidate('beneficiaries', ['beneficiaries']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_templates' },
        () => {
          scheduleInvalidate('sale-templates', ['sale-templates']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_processes' },
        () => {
          scheduleInvalidate('audit', ['audit']);
          scheduleInvalidate('sales-from-audit', ['sales']);
          scheduleInvalidate('sales-list-from-audit', ['sales-list']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          scheduleInvalidate('clients', ['clients']);
          scheduleInvalidate('clients-lookup', ['clients-lookup']);
          scheduleInvalidate('dashboard-stats-from-clients', ['dashboard-stats']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'templates' },
        () => {
          scheduleInvalidate('templates', ['templates']);
          scheduleInvalidate('templates-for-selection', ['templates-for-selection']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans' },
        () => {
          scheduleInvalidate('plans', ['plans']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          scheduleInvalidate('users', ['users']);
          scheduleInvalidate('profile', ['profile']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        () => {
          scheduleInvalidate('companies', ['companies']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_requirements' },
        () => {
          scheduleInvalidate('sale-requirements', ['sale-requirements']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_notes' },
        () => {
          scheduleInvalidate('sale-notes', ['sale-notes']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_settings' },
        () => {
          scheduleInvalidate('company-settings', ['company-settings']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_ui_settings' },
        () => {
          scheduleInvalidate('company-ui-settings', ['company-ui-settings']);
          scheduleInvalidate('sale-progress-config', ['sale-progress-config']);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      invalidateTimeouts.forEach((timeout) => clearTimeout(timeout));
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return { isConnected };
};
