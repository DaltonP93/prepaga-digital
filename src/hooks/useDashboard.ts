
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const ADMIN_ROLES = ['super_admin', 'admin', 'supervisor', 'gestor'];

export const useDashboardStats = () => {
  const { user, userRole } = useSimpleAuthContext();
  const isAdminRole = ADMIN_ROLES.includes(userRole || '');

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, userRole],
    queryFn: async () => {
      try {
        // Get users count
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Get companies count
        const { count: companiesCount, error: companiesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        if (companiesError) throw companiesError;

        // Get sales data - filtered by salesperson for vendedores
        let salesQuery = supabase
          .from('sales')
          .select('total_amount, status, created_at, salesperson_id');

        if (!isAdminRole && user?.id) {
          salesQuery = salesQuery.eq('salesperson_id', user.id);
        }

        const { data: salesData, error: salesError } = await salesQuery;
        if (salesError) throw salesError;

        // Get clients count - for vendedores, count only clients linked to their sales
        let totalClients = 0;
        if (!isAdminRole && user?.id) {
          // Get unique client_ids from this vendedor's sales
          const { data: vendedorSales } = await supabase
            .from('sales')
            .select('client_id')
            .eq('salesperson_id', user.id)
            .not('client_id', 'is', null);

          const uniqueClientIds = [...new Set((vendedorSales || []).map(s => s.client_id).filter(Boolean))];
          totalClients = uniqueClientIds.length;
        } else {
          const { count, error: clientsError } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true });
          if (clientsError) throw clientsError;
          totalClients = count || 0;
        }

        const totalSales = salesData?.length || 0;
        const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
        const completedSales = salesData?.filter(sale => sale.status === 'completado').length || 0;

        // Get signatures count
        const { count: signaturesCount, error: signaturesError } = await supabase
          .from('signatures')
          .select('*', { count: 'exact', head: true });

        if (signaturesError) throw signaturesError;

        const signedDocuments = signaturesCount || 0;
        const pendingSignatures = 0;

        // Get recent sales - filtered for vendedores
        let recentQuery = supabase
          .from('sales')
          .select(`
            *,
            clients:client_id(first_name, last_name),
            plans:plan_id(name),
            companies:company_id(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!isAdminRole && user?.id) {
          recentQuery = recentQuery.eq('salesperson_id', user.id);
        }

        const { data: recentSales, error: recentSalesError } = await recentQuery;
        if (recentSalesError) throw recentSalesError;

        // Get sales by status
        const salesByStatus = salesData?.reduce((acc, sale) => {
          const status = sale.status || 'borrador';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Calculate growth percentages
        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        
        const lastMonthSales = salesData?.filter(sale => 
          new Date(sale.created_at!) >= lastMonth && 
          new Date(sale.created_at!) < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        ).length || 0;

        const currentMonthSales = salesData?.filter(sale => 
          new Date(sale.created_at!) >= new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        ).length || 0;

        const salesGrowth = lastMonthSales > 0 ? 
          Math.round(((currentMonthSales - lastMonthSales) / lastMonthSales) * 100) : 0;

        const clientsGrowth = 0;
        const documentsGrowth = 0;

        return {
          usersCount: usersCount || 0,
          companiesCount: companiesCount || 0,
          totalClients,
          totalSales,
          totalRevenue,
          completedSales,
          signedDocuments,
          pendingSignatures,
          recentSales: recentSales || [],
          salesByStatus,
          salesGrowth,
          clientsGrowth,
          documentsGrowth
        };
      } catch (error) {
        console.error('Dashboard stats error:', error);
        throw error;
      }
    },
    enabled: !!user,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
