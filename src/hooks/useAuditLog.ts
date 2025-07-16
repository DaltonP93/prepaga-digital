import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  table_name: string;
  action: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_path?: string;
  request_method?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface CreateAuditLogParams {
  table_name: string;
  action: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_path?: string;
  request_method?: string;
}

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAuditLogParams) => {
      const { data, error } = await supabase.rpc('log_audit', {
        p_table_name: params.table_name,
        p_action: params.action,
        p_record_id: params.record_id,
        p_old_values: params.old_values,
        p_new_values: params.new_values,
        p_ip_address: params.ip_address,
        p_user_agent: params.user_agent || navigator.userAgent,
        p_session_id: params.session_id,
        p_request_path: params.request_path || window.location.pathname,
        p_request_method: params.request_method,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
    onError: (error: any) => {
      console.error('Error creating audit log:', error);
    },
  });
};

export const useAuthAttempts = () => {
  return useQuery({
    queryKey: ['authAttempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auth_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};

export const useLogAuthAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      success,
      failure_reason,
    }: {
      email: string;
      success: boolean;
      failure_reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('auth_attempts')
        .insert({
          email,
          success,
          failure_reason,
          ip_address: undefined, // Se puede obtener del servidor
          user_agent: navigator.userAgent,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authAttempts'] });
    },
  });
};