import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type {
  CommissionItem,
  CommissionPeriod,
  CommissionPlanSetting,
  CommissionPreviewItem,
  CommissionPreviewParams,
  CommissionProfileOption,
  CommissionPromoterType,
  CommissionRule,
  CommissionRuleInput,
  CommissionSettings,
  CommissionSalespersonConfig,
} from '@/types/commissions';

// Temporary typed boundary until the generated Supabase types include commission_*.
// The cast changes TypeScript's table-name union only; payloads/results remain explicitly typed below.
const commissionFrom = (table: string) => supabase.from(table as 'plans');
const commissionRpc = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name as 'get_user_company_id', args as never);
  if (error) throw error;
  return data as unknown as T;
};

const queryKeys = {
  settings: (companyId?: string | null) => ['commissions', companyId, 'settings'] as const,
  rules: (companyId?: string | null) => ['commissions', companyId, 'rules'] as const,
  periods: (companyId?: string | null) => ['commissions', companyId, 'periods'] as const,
  period: (companyId: string | null | undefined, periodId: string) => ['commissions', companyId, 'period', periodId] as const,
  items: (companyId: string | null | undefined, periodId: string) => ['commissions', companyId, 'items', periodId] as const,
  catalog: (companyId?: string | null) => ['commissions', companyId, 'catalog'] as const,
  salespeople: (companyId?: string | null) => ['commissions', companyId, 'salespeople'] as const,
  preview: (params?: CommissionPreviewParams | null) => ['commissions', params?.companyId, 'preview', params] as const,
};

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Error inesperado';

export const useCommissionSettings = () => {
  const { profile } = useSimpleAuthContext();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: queryKeys.settings(companyId),
    enabled: Boolean(companyId),
    retry: false,
    queryFn: async (): Promise<CommissionSettings | null> => {
      const { data, error } = await commissionFrom('commission_settings')
        .select('*').eq('company_id', companyId!).maybeSingle();
      if (error) throw error;
      return data as unknown as CommissionSettings | null;
    },
  });
};

export const useSaveCommissionSettings = () => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Pick<CommissionSettings, 'accrual_event' | 'liquidation_prefix' | 'is_enabled'>) => {
      if (!profile?.company_id) throw new Error('No se encontró la empresa del usuario.');
      const prefix = input.liquidation_prefix.trim();
      if (!prefix) throw new Error('El prefijo de liquidación es obligatorio.');
      const { data, error } = await commissionFrom('commission_settings').upsert({ company_id: profile.company_id, accrual_event: input.accrual_event, liquidation_prefix: prefix, is_enabled: input.is_enabled } as never, { onConflict: 'company_id' }).select().single();
      if (error) throw error;
      return data as unknown as CommissionSettings;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.settings(profile?.company_id) }); toast.success('Configuración de comisiones guardada'); },
    onError: (error) => toast.error(messageOf(error)),
  });
};

export const useCommissionCatalog = () => {
  const { profile } = useSimpleAuthContext();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: queryKeys.catalog(companyId),
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [salespeople, plans, promoterTypes, planSettings] = await Promise.all([
        commissionRpc<CommissionSalespersonConfig[]>('commission_list_salespeople', { p_company_id: companyId! }),
        supabase.from('plans').select('id,name').eq('company_id', companyId!).eq('is_active', true).order('name'),
        commissionFrom('commission_promoter_types').select('*').eq('company_id', companyId!).eq('is_active', true).order('name'),
        commissionFrom('commission_plan_settings').select('*,plans:plan_id(id,name)').eq('company_id', companyId!).eq('is_active', true),
      ]);
      const error = plans.error || promoterTypes.error || planSettings.error;
      if (error) throw error;
      return {
        profiles: salespeople.map(({ salesperson_id, display_name, email }) => ({ id: salesperson_id, display_name, email })) as CommissionProfileOption[],
        plans: (plans.data || []) as Array<{ id: string; name: string }>,
        promoterTypes: (promoterTypes.data || []) as unknown as CommissionPromoterType[],
        planSettings: (planSettings.data || []) as unknown as CommissionPlanSetting[],
      };
    },
  });
};

export const useCommissionRules = () => {
  const { profile } = useSimpleAuthContext();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: queryKeys.rules(companyId),
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CommissionRule[]> => {
      const { data, error } = await commissionFrom('commission_rules').select(`
        *, salesperson:salesperson_id(id,first_name,last_name),
        promoter_type:promoter_type_id(id,code,name), plan:plan_id(id,name)
      `).eq('company_id', companyId!).order('priority', { ascending: false }).order('valid_from', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CommissionRule[];
    },
  });
};

export const useCommissionSalespeople = () => {
  const { profile } = useSimpleAuthContext();
  return useQuery({
    queryKey: queryKeys.salespeople(profile?.company_id), enabled: Boolean(profile?.company_id),
    queryFn: async (): Promise<CommissionSalespersonConfig[]> => {
      return commissionRpc<CommissionSalespersonConfig[]>('commission_list_salespeople', { p_company_id: profile!.company_id! });
    },
  });
};

export const useSaveCommissionSalesperson = () => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salesperson_id: string; promoter_type_id: string; is_active: boolean }) => {
      if (!profile?.company_id) throw new Error('Empresa no disponible');
      const { data, error } = await commissionFrom('commission_salespeople').upsert({ ...input, company_id: profile.company_id } as never, { onConflict: 'company_id,salesperson_id' }).select().single();
      if (error) throw error;
      return data as unknown as CommissionSalespersonConfig;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.salespeople(profile?.company_id) }); toast.success('Vendedor configurado'); },
    onError: (error) => toast.error(`No se pudo configurar: ${messageOf(error)}`),
  });
};

export const useSaveCommissionRule = () => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CommissionRuleInput & { id?: string }) => {
      if (!profile?.company_id) throw new Error('Empresa no disponible');
      const payload = { ...input, company_id: profile.company_id };
      const query = id
        ? commissionFrom('commission_rules').update(payload as never).eq('id', id)
        : commissionFrom('commission_rules').insert(payload as never);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data as unknown as CommissionRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules(profile?.company_id) });
      toast.success('Regla guardada');
    },
    onError: (error) => toast.error(`No se pudo guardar: ${messageOf(error)}`),
  });
};

export const useDeactivateCommissionRule = () => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await commissionFrom('commission_rules').update({ is_active: false } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules(profile?.company_id) });
      toast.success('Regla desactivada');
    },
    onError: (error) => toast.error(`No se pudo desactivar: ${messageOf(error)}`),
  });
};

export const useCommissionPreview = (params: CommissionPreviewParams | null) => useQuery({
  queryKey: queryKeys.preview(params),
  enabled: Boolean(params?.companyId && params.salespersonId && params.periodStart && params.periodEnd),
  queryFn: async () => {
    const rows = await commissionRpc<Array<Omit<CommissionPreviewItem, 'has_rule'>>>('commission_preview', {
      p_company_id: params!.companyId,
      p_salesperson_id: params!.salespersonId,
      p_from: params!.periodStart,
      p_to: params!.periodEnd,
    });
    return rows.map((row) => ({ ...row, has_rule: !row.error_code && Boolean(row.rule_id) }));
  },
});

export const useGenerateCommissionPeriod = () => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CommissionPreviewParams) => commissionRpc<string>('commission_generate_period', {
      p_company_id: params.companyId,
      p_salesperson_id: params.salespersonId,
      p_from: params.periodStart,
      p_to: params.periodEnd,
    }),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periods(profile?.company_id) });
      queryClient.removeQueries({ queryKey: ['commissions', params.companyId, 'preview'] });
      toast.success('Liquidación generada en borrador');
    },
    onError: (error) => toast.error(`No se pudo generar: ${messageOf(error)}`),
  });
};

export const useCommissionPeriods = () => {
  const { profile } = useSimpleAuthContext();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: queryKeys.periods(companyId),
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CommissionPeriod[]> => {
      const { data, error } = await commissionFrom('commission_periods')
        .select('*')
        .eq('company_id', companyId!).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CommissionPeriod[];
    },
  });
};

export const useCommissionPeriod = (periodId: string) => {
  const { profile } = useSimpleAuthContext();
  return useQuery({
    queryKey: queryKeys.period(profile?.company_id, periodId),
    enabled: Boolean(profile?.company_id && periodId),
    queryFn: async (): Promise<CommissionPeriod> => {
      const { data, error } = await commissionFrom('commission_periods')
        .select('*').eq('id', periodId).single();
      if (error) throw error;
      return data as unknown as CommissionPeriod;
    },
  });
};

export const useCommissionItems = (periodId: string) => {
  const { profile } = useSimpleAuthContext();
  return useQuery({
    queryKey: queryKeys.items(profile?.company_id, periodId),
    enabled: Boolean(profile?.company_id && periodId),
    queryFn: async (): Promise<CommissionItem[]> => {
      const { data, error } = await commissionFrom('commission_items')
        .select('*').eq('period_id', periodId).order('item_number');
      if (error) throw error;
      return (data || []) as unknown as CommissionItem[];
    },
  });
};

const usePeriodAction = (rpcName: 'commission_close_period' | 'commission_pay_period' | 'commission_annul_period') => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodId, reason }: { periodId: string; reason?: string }) => commissionRpc<void>(rpcName, {
      p_period_id: periodId,
      ...(reason ? { p_reason: reason } : {}),
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periods(profile?.company_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.period(profile?.company_id, variables.periodId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items(profile?.company_id, variables.periodId) });
      const actionMessage = rpcName === 'commission_close_period'
        ? 'Liquidación cerrada'
        : rpcName === 'commission_pay_period' ? 'Liquidación marcada como pagada' : 'Liquidación anulada';
      toast.success(actionMessage);
    },
    onError: (error) => toast.error(`No se pudo completar la acción: ${messageOf(error)}`),
  });
};

export const useCloseCommissionPeriod = () => usePeriodAction('commission_close_period');
export const usePayCommissionPeriod = () => usePeriodAction('commission_pay_period');
export const useAnnulCommissionPeriod = () => usePeriodAction('commission_annul_period');

export const downloadCommissionPdf = async (periodId: string) => {
  const { data, error } = await supabase.functions.invoke('generate-commission-pdf', { body: { period_id: periodId } });
  if (error) throw error;
  if (!(data instanceof Blob)) throw new Error('El generador no devolvió un PDF válido');
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `liquidacion-${periodId.slice(0, 8)}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
