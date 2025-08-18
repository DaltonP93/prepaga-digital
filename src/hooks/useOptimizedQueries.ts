
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook optimizado para dashboard con LIMIT y columnas específicas
export const useOptimizedDashboard = () => {
  return useQuery({
    queryKey: ['optimized-dashboard'],
    queryFn: async () => {
      // Solo obtener las columnas necesarias con LIMIT
      const [salesResult, clientsResult, recentSalesResult] = await Promise.all([
        // Stats básicas de ventas
        supabase
          .from('sales')
          .select('id, status, total_amount, created_at')
          .order('created_at', { ascending: false })
          .limit(100),

        // Count de clientes
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true }),

        // Ventas recientes con relaciones mínimas
        supabase
          .from('sales')
          .select(`
            id,
            contract_number,
            total_amount,
            status,
            created_at,
            clients:client_id(first_name, last_name),
            plans:plan_id(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (salesResult.error) throw salesResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (recentSalesResult.error) throw recentSalesResult.error;

      const sales = salesResult.data || [];
      const totalClients = clientsResult.count || 0;
      const recentSales = recentSalesResult.data || [];

      // Calcular métricas
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const completedSales = sales.filter(sale => sale.status === 'completado').length;
      const pendingSales = sales.filter(sale => sale.status === 'pendiente').length;

      // Calcular crecimiento (últimos 30 días vs anteriores 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentSalesCount = sales.filter(sale => 
        new Date(sale.created_at) >= thirtyDaysAgo
      ).length;

      const previousSalesCount = sales.filter(sale => 
        new Date(sale.created_at) >= sixtyDaysAgo && 
        new Date(sale.created_at) < thirtyDaysAgo
      ).length;

      const salesGrowth = previousSalesCount > 0 
        ? Math.round(((recentSalesCount - previousSalesCount) / previousSalesCount) * 100)
        : 0;

      return {
        totalSales,
        totalRevenue,
        totalClients,
        completedSales,
        pendingSales,
        recentSales,
        salesGrowth,
        clientsGrowth: Math.max(0, Math.round(Math.random() * 15)), // Placeholder
        documentsGrowth: Math.max(0, Math.round(Math.random() * 10)), // Placeholder
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    refetchOnWindowFocus: false,
  });
};

// Hook para búsquedas optimizadas
export const useOptimizedSearch = (searchTerm: string, table: string) => {
  return useQuery({
    queryKey: ['optimized-search', table, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      let query = supabase.from(table);

      // Búsquedas específicas por tabla con índices
      switch (table) {
        case 'clients':
          query = query
            .select('id, first_name, last_name, email, dni')
            .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,dni.ilike.%${searchTerm}%`)
            .limit(10);
          break;
        
        case 'sales':
          query = query
            .select('id, contract_number, request_number, status, total_amount, created_at')
            .or(`contract_number.ilike.%${searchTerm}%,request_number.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(10);
          break;

        default:
          return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
  });
};
