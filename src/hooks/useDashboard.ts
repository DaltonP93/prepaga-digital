
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

        // Get signed documents count (documents with signed_at)
        const { count: signedDocsCount, error: signedDocsError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .not('signed_at', 'is', null);

        if (signedDocsError) throw signedDocsError;

        // Get completed signature links count
        const { count: completedLinksCount, error: linksError } = await supabase
          .from('signature_links')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completado');

        if (linksError) throw linksError;

        // Use the higher of both counts for signed documents
        const signedDocuments = Math.max(signedDocsCount || 0, completedLinksCount || 0);

        // Get pending signature links
        const { count: pendingLinksCount, error: pendingLinksError } = await supabase
          .from('signature_links')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendiente');

        if (pendingLinksError) throw pendingLinksError;
        const pendingSignatures = pendingLinksCount || 0;

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
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        
        const lastMonthSales = salesData?.filter(sale => 
          new Date(sale.created_at!) >= lastMonthStart && 
          new Date(sale.created_at!) < currentMonthStart
        ).length || 0;

        const currentMonthSales = salesData?.filter(sale => 
          new Date(sale.created_at!) >= currentMonthStart
        ).length || 0;

        const salesGrowth = lastMonthSales > 0 ? 
          Math.round(((currentMonthSales - lastMonthSales) / lastMonthSales) * 100) : 0;

        // Calculate clients growth (current month vs last month)
        let clientsGrowth = 0;
        if (!isAdminRole && user?.id) {
          // For vendedor, skip client growth calculation
          clientsGrowth = 0;
        } else {
          const { count: currentMonthClients } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', currentMonthStart.toISOString());

          const { count: lastMonthClients } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', lastMonthStart.toISOString())
            .lt('created_at', currentMonthStart.toISOString());

          clientsGrowth = (lastMonthClients || 0) > 0 
            ? Math.round((((currentMonthClients || 0) - (lastMonthClients || 0)) / (lastMonthClients || 1)) * 100) 
            : 0;
        }

        // Calculate documents growth
        const { count: currentMonthDocs } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .not('signed_at', 'is', null)
          .gte('signed_at', currentMonthStart.toISOString());

        const { count: lastMonthDocs } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .not('signed_at', 'is', null)
          .gte('signed_at', lastMonthStart.toISOString())
          .lt('signed_at', currentMonthStart.toISOString());

        const documentsGrowth = (lastMonthDocs || 0) > 0 
          ? Math.round((((currentMonthDocs || 0) - (lastMonthDocs || 0)) / (lastMonthDocs || 1)) * 100) 
          : 0;

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
