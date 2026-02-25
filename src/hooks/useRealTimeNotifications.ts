
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRealTimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('realtime-all-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          const doc = payload.new as any;
          queryClient.invalidateQueries({ queryKey: ['sale-generated-documents'] });
          if (doc?.sale_id) {
            queryClient.invalidateQueries({ queryKey: ['sale-generated-documents', doc.sale_id] });
            queryClient.invalidateQueries({ queryKey: ['signature-link-documents'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signature_links' },
        (payload) => {
          const link = payload.new as any;
          queryClient.invalidateQueries({ queryKey: ['signature-links'] });
          queryClient.invalidateQueries({ queryKey: ['all-signature-links-public'] });
          if (link?.sale_id) {
            queryClient.invalidateQueries({ queryKey: ['signature-links', link.sale_id] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
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
          queryClient.invalidateQueries({ queryKey: ['signature-workflow-steps'] });
          queryClient.invalidateQueries({ queryKey: ['signature-links'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beneficiaries' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_templates' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sale-templates'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_processes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit'] });
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('Realtime connection status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return { isConnected };
};
