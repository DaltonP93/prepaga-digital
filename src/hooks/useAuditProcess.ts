
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuditProcess {
  id: string;
  sale_id: string;
  auditor_id: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'more_info_required';
  notes?: string;
  created_at: string;
  updated_at: string;
  sale?: {
    id: string;
    client_id: string;
    plan_id: string;
    status: string;
    clients?: {
      first_name: string;
      last_name: string;
      email: string;
    };
    plans?: {
      name: string;
      price: number;
    };
    salesperson?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  auditor?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  information_requests?: InformationRequest[];
}

interface InformationRequest {
  id: string;
  audit_process_id: string;
  requested_by: string;
  description: string;
  status: 'pending' | 'completed';
  created_at: string;
  completed_at?: string;
  information_responses?: InformationResponse[];
}

interface InformationResponse {
  id: string;
  information_request_id: string;
  response?: string;
  document_url?: string;
  responded_by?: string;
  created_at: string;
}

export const useAuditProcesses = () => {
  return useQuery({
    queryKey: ['audit-processes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_processes')
        .select(`
          *,
          sale:sales(
            id,
            client_id,
            plan_id,
            status,
            clients:client_id(first_name, last_name, email),
            plans:plan_id(name, price),
            salesperson:salesperson_id(first_name, last_name, email)
          ),
          auditor:profiles!auditor_id(first_name, last_name, email),
          information_requests(
            *,
            information_responses(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditProcess[];
    },
  });
};

export const useCreateAuditProcess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, auditorId, notes }: { saleId: string; auditorId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('audit_processes')
        .insert({
          sale_id: saleId,
          auditor_id: auditorId,
          status: 'pending',
          notes
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar en trazabilidad
      await supabase
        .from('process_traces')
        .insert({
          sale_id: saleId,
          action: 'audit_started',
          performed_by: auditorId,
          details: { audit_process_id: data.id }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      toast({
        title: "Proceso de auditoría iniciado",
        description: "El proceso de auditoría ha sido creado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar el proceso de auditoría.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateAuditProcess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('audit_processes')
        .update({ status, notes })
        .eq('id', id)
        .select(`
          *,
          sale:sales(id, client_id)
        `)
        .single();

      if (error) throw error;

      // Registrar en trazabilidad
      await supabase
        .from('process_traces')
        .insert({
          sale_id: data.sale.id,
          action: `audit_${status}`,
          performed_by: (await supabase.auth.getUser()).data.user?.id,
          details: { audit_process_id: id, notes }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      toast({
        title: "Proceso actualizado",
        description: "El estado del proceso de auditoría ha sido actualizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el proceso de auditoría.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateInformationRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auditProcessId, description }: { auditProcessId: string; description: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('information_requests')
        .insert({
          audit_process_id: auditProcessId,
          requested_by: user.user.id,
          description,
          status: 'pending'
        })
        .select(`
          *,
          audit_process:audit_processes(
            sale:sales(id, client_id)
          )
        `)
        .single();

      if (error) throw error;

      // Actualizar estado del proceso de auditoría
      await supabase
        .from('audit_processes')
        .update({ status: 'more_info_required' })
        .eq('id', auditProcessId);

      // Registrar en trazabilidad
      await supabase
        .from('process_traces')
        .insert({
          sale_id: data.audit_process.sale.id,
          action: 'info_requested',
          performed_by: user.user.id,
          details: { 
            information_request_id: data.id,
            description
          }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      toast({
        title: "Información solicitada",
        description: "La solicitud de información ha sido enviada al vendedor.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo solicitar la información.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateInformationResponse = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      informationRequestId, 
      response, 
      documentUrl 
    }: { 
      informationRequestId: string; 
      response?: string; 
      documentUrl?: string; 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('information_responses')
        .insert({
          information_request_id: informationRequestId,
          response,
          document_url: documentUrl,
          responded_by: user.user.id
        })
        .select(`
          *,
          information_request:information_requests(
            audit_process:audit_processes(
              sale:sales(id)
            )
          )
        `)
        .single();

      if (error) throw error;

      // Marcar solicitud como completada
      await supabase
        .from('information_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', informationRequestId);

      // Actualizar estado del proceso de auditoría
      await supabase
        .from('audit_processes')
        .update({ status: 'in_review' })
        .eq('id', data.information_request.audit_process.id);

      // Registrar en trazabilidad
      await supabase
        .from('process_traces')
        .insert({
          sale_id: data.information_request.audit_process.sale.id,
          action: 'info_provided',
          performed_by: user.user.id,
          details: { 
            information_request_id: informationRequestId,
            has_document: !!documentUrl
          }
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-processes'] });
      toast({
        title: "Información enviada",
        description: "La información ha sido enviada al auditor para su revisión.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la información.",
        variant: "destructive",
      });
    },
  });
};
