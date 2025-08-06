
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const MEMORY_CACHE = new Map();

interface CacheOptions {
  ttl?: number;
  useMemory?: boolean;
  useSession?: boolean;
}

export const useSmartCache = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    ttl = CACHE_TTL,
    useMemory = true,
    useSession = true
  } = options;

  const getCacheKey = (key: string) => `smart_cache_${key}`;

  const getCachedData = useCallback((cacheKey: string) => {
    // 1. Verificar caché en memoria
    if (useMemory && MEMORY_CACHE.has(cacheKey)) {
      const { data, timestamp } = MEMORY_CACHE.get(cacheKey);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
      MEMORY_CACHE.delete(cacheKey);
    }

    // 2. Verificar sessionStorage
    if (useSession) {
      try {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          const { data, timestamp } = JSON.parse(cachedItem);
          if (Date.now() - timestamp < ttl) {
            // Actualizar caché en memoria
            if (useMemory) {
              MEMORY_CACHE.set(cacheKey, { data, timestamp });
            }
            return data;
          }
          sessionStorage.removeItem(cacheKey);
        }
      } catch (error) {
        console.warn('Error reading from sessionStorage:', error);
      }
    }

    return null;
  }, [ttl, useMemory, useSession]);

  const setCachedData = useCallback((cacheKey: string, data: T) => {
    const timestamp = Date.now();
    
    // Guardar en memoria
    if (useMemory) {
      MEMORY_CACHE.set(cacheKey, { data, timestamp });
    }

    // Guardar en sessionStorage
    if (useSession) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp }));
      } catch (error) {
        console.warn('Error writing to sessionStorage:', error);
      }
    }
  }, [useMemory, useSession]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
      setCachedData(getCacheKey(key), result);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, key, setCachedData]);

  const invalidateCache = useCallback(() => {
    const cacheKey = getCacheKey(key);
    MEMORY_CACHE.delete(cacheKey);
    sessionStorage.removeItem(cacheKey);
    fetchData();
  }, [key, fetchData]);

  useEffect(() => {
    const cacheKey = getCacheKey(key);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [key, getCachedData, fetchData]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData, 
    invalidateCache,
    isFromCache: !loading && data !== null
  };
};

// Hook específico para consultas de Supabase optimizadas
export const useOptimizedQuery = <T>(
  table: string,
  query: string,
  filters?: Record<string, any>,
  options?: CacheOptions & { page?: number; pageSize?: number }
) => {
  const { page = 1, pageSize = 50, ...cacheOptions } = options || {};
  
  const fetchFn = useCallback(async (): Promise<T> => {
    let queryBuilder = supabase.from(table).select(query);
    
    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryBuilder = queryBuilder.eq(key, value);
        }
      });
    }
    
    // Aplicar paginación
    if (pageSize > 0) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      queryBuilder = queryBuilder.range(from, to);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) throw error;
    return data as T;
  }, [table, query, filters, page, pageSize]);

  const cacheKey = `${table}_${query}_${JSON.stringify(filters)}_${page}_${pageSize}`;
  
  return useSmartCache(cacheKey, fetchFn, cacheOptions);
};
