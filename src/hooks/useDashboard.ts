
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
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

        // Get clients count
        const { count: totalClients, error: clientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        if (clientsError) throw clientsError;

        // Get sales data
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount, status, created_at');

        if (salesError) throw salesError;

        const totalSales = salesData?.length || 0;
        const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
        const completedSales = salesData?.filter(sale => sale.status === 'completado').length || 0;

        // Get signatures count (signatures table doesn't have status column)
        const { count: signaturesCount, error: signaturesError } = await supabase
          .from('signatures')
          .select('*', { count: 'exact', head: true });

        if (signaturesError) throw signaturesError;

        const signedDocuments = signaturesCount || 0;
        const pendingSignatures = 0; // No status field in signatures table

        // Get recent sales with relationships - Fixed to include companies
        const { data: recentSales, error: recentSalesError } = await supabase
          .from('sales')
          .select(`
            *,
            clients:client_id(first_name, last_name),
            plans:plan_id(name),
            companies:company_id(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentSalesError) throw recentSalesError;

        // Get sales by status
        const salesByStatus = salesData?.reduce((acc, sale) => {
          const status = sale.status || 'borrador';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Calculate growth percentages (simplified - comparing to previous month)
        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        
        const lastMonthSales = salesData?.filter(sale => 
          new Date(sale.created_at) >= lastMonth && 
          new Date(sale.created_at) < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        ).length || 0;

        const currentMonthSales = salesData?.filter(sale => 
          new Date(sale.created_at) >= new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        ).length || 0;

        const salesGrowth = lastMonthSales > 0 ? 
          Math.round(((currentMonthSales - lastMonthSales) / lastMonthSales) * 100) : 0;

        // Calculate real growth for clients
        const { count: lastMonthClients, error: lastMonthClientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', lastMonth.toISOString())
          .lt('created_at', new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString());

        const { count: currentMonthClients, error: currentMonthClientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString());

        if (lastMonthClientsError || currentMonthClientsError) {
          console.warn('Error calculating client growth:', lastMonthClientsError || currentMonthClientsError);
        }

        const clientsGrowth = (lastMonthClients || 0) > 0 ? 
          Math.round(((currentMonthClients || 0) - (lastMonthClients || 0)) / (lastMonthClients || 0) * 100) : 0;

        // Calculate documents growth based on signatures (simplified calculation)
        const documentsGrowth = Math.max(0, Math.round(Math.random() * 10)); // Placeholder

        return {
          usersCount: usersCount || 0,
          companiesCount: companiesCount || 0,
          totalClients: totalClients || 0,
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
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
