import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type AuthAttemptRow = Database['public']['Tables']['auth_attempts']['Row'];

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entity_type: string;
      action: string;
      entity_id?: string;
      old_values?: any;
      new_values?: any;
      ip_address?: string;
      user_agent?: string;
    }) => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user?.id || '')
        .single();

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: params.entity_type,
          action: params.action,
          entity_id: params.entity_id,
          old_values: params.old_values,
          new_values: params.new_values,
          ip_address: params.ip_address,
          user_agent: params.user_agent || navigator.userAgent,
          user_id: userData.user?.id,
          company_id: profile?.company_id,
        })
        .select()
        .single();

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
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
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
