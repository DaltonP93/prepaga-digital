
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from './useSmartCache';

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
}

interface FilterOptions {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

// Hook optimizado para sales
export const useOptimizedSales = (
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  const { page = 1, pageSize = 25, orderBy = 'created_at', ascending = false } = pagination;
  
  const query = `
    id,
    status,
    total_amount,
    sale_date,
    created_at,
    contract_number,
    clients:client_id(
      id,
      first_name,
      last_name,
      email
    ),
    plans:plan_id(
      id,
      name,
      price
    ),
    salesperson:salesperson_id(
      id,
      first_name,
      last_name
    )
  `;

  // Construir filtros optimizados
  const optimizedFilters = useMemo(() => {
    const result: Record<string, any> = {};
    
    if (filters.status && filters.status !== 'all') {
      result.status = filters.status;
    }
    
    return result;
  }, [filters]);

  const fetchFn = useCallback(async () => {
    let queryBuilder = supabase
      .from('sales')
      .select(query, { count: 'exact' })
      .order(orderBy, { ascending });

    // Aplicar filtros
    Object.entries(optimizedFilters).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    // Filtro de búsqueda (requiere índice de texto completo)
    if (filters.search) {
      queryBuilder = queryBuilder.or(`
        contract_number.ilike.%${filters.search}%,
        clients.first_name.ilike.%${filters.search}%,
        clients.last_name.ilike.%${filters.search}%,
        clients.email.ilike.%${filters.search}%
      `);
    }

    // Filtros de fecha
    if (filters.dateFrom) {
      queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      queryBuilder = queryBuilder.lte('created_at', filters.dateTo);
    }

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      hasMore: count ? (page * pageSize) < count : false,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    };
  }, [query, orderBy, ascending, optimizedFilters, filters.search, filters.dateFrom, filters.dateTo, page, pageSize]);

  const cacheKey = `sales_${JSON.stringify(filters)}_${page}_${pageSize}_${orderBy}_${ascending}`;
  
  return useOptimizedQuery(
    'sales',
    cacheKey,
    fetchFn,
    { ttl: 2 * 60 * 1000 } // 2 minutos para datos dinámicos
  );
};

// Hook optimizado para documents
export const useOptimizedDocuments = (
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  const { page = 1, pageSize = 25, orderBy = 'created_at', ascending = false } = pagination;
  
  const query = `
    id,
    name,
    document_type,
    is_required,
    order_index,
    created_at,
    file_url,
    content,
    sales:sale_id(
      id,
      contract_number,
      clients:client_id(first_name, last_name)
    ),
    plans:plan_id(name),
    templates:template_id(name)
  `;

  const fetchFn = useCallback(async () => {
    let queryBuilder = supabase
      .from('documents')
      .select(query, { count: 'exact' })
      .order(orderBy, { ascending });

    // Filtros
    if (filters.search) {
      queryBuilder = queryBuilder.ilike('name', `%${filters.search}%`);
    }

    if (filters.document_type && filters.document_type !== 'all') {
      queryBuilder = queryBuilder.eq('document_type', filters.document_type);
    }

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      hasMore: count ? (page * pageSize) < count : false,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    };
  }, [query, orderBy, ascending, filters, page, pageSize]);

  const cacheKey = `documents_${JSON.stringify(filters)}_${page}_${pageSize}_${orderBy}_${ascending}`;
  
  return useOptimizedQuery(
    'documents',
    cacheKey,
    fetchFn,
    { ttl: 5 * 60 * 1000 } // 5 minutos para documentos
  );
};

// Hook optimizado para clientes
export const useOptimizedClients = (
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  const { page = 1, pageSize = 25, orderBy = 'created_at', ascending = false } = pagination;
  
  const query = `
    id,
    first_name,
    last_name,
    email,
    phone,
    dni,
    created_at,
    birth_date
  `;

  const fetchFn = useCallback(async () => {
    let queryBuilder = supabase
      .from('clients')
      .select(query, { count: 'exact' })
      .order(orderBy, { ascending });

    // Filtro de búsqueda optimizado
    if (filters.search) {
      queryBuilder = queryBuilder.or(`
        first_name.ilike.%${filters.search}%,
        last_name.ilike.%${filters.search}%,
        email.ilike.%${filters.search}%,
        dni.ilike.%${filters.search}%
      `);
    }

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      hasMore: count ? (page * pageSize) < count : false,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    };
  }, [query, orderBy, ascending, filters, page, pageSize]);

  const cacheKey = `clients_${JSON.stringify(filters)}_${page}_${pageSize}_${orderBy}_${ascending}`;
  
  return useOptimizedQuery(
    'clients',
    cacheKey,
    fetchFn,
    { ttl: 10 * 60 * 1000 } // 10 minutos para clientes
  );
};

// Hook para estadísticas del dashboard optimizado
export const useOptimizedDashboardStats = () => {
  const fetchFn = useCallback(async () => {
    // Realizar consultas en paralelo para mejor rendimiento
    const [salesStats, documentsStats, clientsStats] = await Promise.all([
      supabase
        .from('sales')
        .select('status, total_amount', { count: 'exact' }),
      supabase
        .from('documents')
        .select('document_type', { count: 'exact' }),
      supabase
        .from('clients')
        .select('id', { count: 'exact' })
    ]);

    if (salesStats.error || documentsStats.error || clientsStats.error) {
      throw new Error('Error fetching dashboard stats');
    }

    // Procesar estadísticas de ventas
    const totalSales = salesStats.count || 0;
    const totalRevenue = salesStats.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const salesByStatus = salesStats.data?.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalSales,
      totalRevenue,
      totalDocuments: documentsStats.count || 0,
      totalClients: clientsStats.count || 0,
      salesByStatus,
      lastUpdated: new Date().toISOString()
    };
  }, []);

  return useOptimizedQuery(
    'dashboard',
    'stats',
    fetchFn,
    { ttl: 60 * 1000 } // 1 minuto para stats del dashboard
  );
};
