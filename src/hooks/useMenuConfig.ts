import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export type MenuConfigMap = Record<string, Record<string, boolean>>;

const CONFIGURABLE_ROLES = ['admin', 'supervisor', 'auditor', 'gestor', 'vendedor'] as const;

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', alwaysVisible: true },
  { key: 'sales', label: 'Ventas' },
  { key: 'clients', label: 'Clientes' },
  { key: 'plans', label: 'Planes' },
  { key: 'documents', label: 'Documentos' },
  { key: 'templates', label: 'Templates' },
  { key: 'signature-workflow', label: 'Flujo de Firmas' },
  { key: 'audit', label: 'Auditoría' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'profile', label: 'Mi Perfil', alwaysVisible: true },
  { key: 'users', label: 'Usuarios' },
  { key: 'companies', label: 'Empresas', superAdminOnly: true },
  { key: 'settings', label: 'Configuración' },
] as const;

export { MENU_ITEMS, CONFIGURABLE_ROLES };

const DEFAULT_CONFIG: MenuConfigMap = {
  dashboard: { admin: true, supervisor: true, auditor: true, gestor: true, vendedor: true },
  sales: { admin: true, supervisor: true, auditor: false, gestor: true, vendedor: true },
  clients: { admin: true, supervisor: true, auditor: false, gestor: true, vendedor: true },
  plans: { admin: true, supervisor: true, auditor: false, gestor: true, vendedor: true },
  documents: { admin: true, supervisor: true, auditor: false, gestor: true, vendedor: true },
  templates: { admin: true, supervisor: true, auditor: false, gestor: true, vendedor: true },
  'signature-workflow': { admin: true, supervisor: true, auditor: false, gestor: true, vendedor: true },
  audit: { admin: true, supervisor: true, auditor: true, gestor: false, vendedor: false },
  analytics: { admin: true, supervisor: true, auditor: true, gestor: false, vendedor: false },
  profile: { admin: true, supervisor: true, auditor: true, gestor: true, vendedor: true },
  users: { admin: true, supervisor: false, auditor: false, gestor: false, vendedor: false },
  companies: { admin: false, supervisor: false, auditor: false, gestor: false, vendedor: false },
  settings: { admin: true, supervisor: false, auditor: false, gestor: false, vendedor: false },
};

export { DEFAULT_CONFIG };

export const useMenuConfig = () => {
  const { profile } = useSimpleAuthContext();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['menu-config', companyId],
    queryFn: async (): Promise<MenuConfigMap | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('company_settings')
        .select('menu_config')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return (data?.menu_config as MenuConfigMap) || null;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveMenuConfig = () => {
  const { profile } = useSimpleAuthContext();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  return useMutation({
    mutationFn: async (menuConfig: MenuConfigMap) => {
      if (!companyId) throw new Error('No company_id');
      // Upsert: create row if it doesn't exist, update if it does
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          { company_id: companyId, menu_config: menuConfig } as any,
          { onConflict: 'company_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-config', companyId] });
    },
  });
};

/**
 * Check if a menu item should be visible for the current user.
 * Uses saved config if available, otherwise DEFAULT_CONFIG.
 * super_admin always sees everything.
 */
export const useMenuVisibility = () => {
  const { data: savedConfig } = useMenuConfig();
  const { role, isSuperAdmin } = useRolePermissions();

  // Always use a config: saved from DB or defaults
  const activeConfig = savedConfig || DEFAULT_CONFIG;

  const isVisible = (routeKey: string): boolean | null => {
    if (isSuperAdmin) return true;
    if (!role) return null;
    const itemConfig = activeConfig[routeKey];
    if (!itemConfig) return null;
    return itemConfig[role] ?? null;
  };

  return { isVisible, hasConfig: !!savedConfig };
};
