
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get companies count
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Get sales count and total revenue
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, status');

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const completedSales = salesData?.filter(sale => sale.status === 'completado').length || 0;

      // Get recent sales
      const { data: recentSales } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name),
          plans:plan_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get sales by status
      const salesByStatus = salesData?.reduce((acc, sale) => {
        const status = sale.status || 'borrador';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        usersCount: usersCount || 0,
        companiesCount: companiesCount || 0,
        totalSales,
        totalRevenue,
        completedSales,
        recentSales: recentSales || [],
        salesByStatus
      };
    },
  });
};
