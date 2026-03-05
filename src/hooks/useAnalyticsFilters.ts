import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import type { AnalyticsFilters } from './useAdvancedAnalytics';

const ADMIN_ROLES = ['super_admin', 'admin', 'supervisor', 'gestor', 'auditor'];

export const useAnalyticsFilters = () => {
  const { user, userRole } = useSimpleAuthContext();
  const isAdminRole = ADMIN_ROLES.includes(userRole || '');

  const [filters, setFilters] = useState<AnalyticsFilters>({});

  // Fetch companies for filter
  const { data: companies } = useQuery({
    queryKey: ['analytics-filter-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch plans for filter
  const { data: plans } = useQuery({
    queryKey: ['analytics-filter-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch salespersons for filter (only for admin roles)
  const { data: salespersons } = useQuery({
    queryKey: ['analytics-filter-salespersons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sin nombre',
        role: (p as any).role,
      }));
    },
    enabled: isAdminRole,
  });

  const setCompanyId = (id: string | undefined) => {
    setFilters(prev => ({ ...prev, companyId: id }));
  };

  const setPlanId = (id: string | undefined) => {
    setFilters(prev => ({ ...prev, planId: id }));
  };

  const setSalespersonId = (id: string | undefined) => {
    setFilters(prev => ({ ...prev, salespersonId: id }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = useMemo(() => {
    return !!(filters.companyId || filters.planId || filters.salespersonId);
  }, [filters]);

  return {
    filters,
    companies: companies || [],
    plans: plans || [],
    salespersons: salespersons || [],
    isAdminRole,
    setCompanyId,
    setPlanId,
    setSalespersonId,
    clearFilters,
    hasActiveFilters,
  };
};
