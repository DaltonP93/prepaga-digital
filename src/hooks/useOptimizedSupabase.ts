
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSmartCache } from './useSmartCache';

interface QueryOptions {
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export const useOptimizedQuery = <T = any>(
  table: string,
  select: string = '*',
  options: QueryOptions & { cacheKey?: string; ttl?: number } = {}
) => {
  const { filters, orderBy, limit, offset, cacheKey, ttl } = options;

  const fetchFn = useCallback(async (): Promise<T> => {
    console.log(`Fetching from ${table}...`);
    
    let query = supabase.from(table).select(select);
    
    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });
    }
    
    // Aplicar ordenamiento
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    // Aplicar límite y offset
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      throw error;
    }
    
    return data as T;
  }, [table, select, filters, orderBy, limit, offset]);

  const defaultCacheKey = `${table}_${select}_${JSON.stringify(filters || {})}_${JSON.stringify(orderBy || {})}_${limit || 'all'}_${offset || 0}`;
  
  return useSmartCache<T>(cacheKey || defaultCacheKey, fetchFn, { ttl });
};

export const useOptimizedMutation = (table: string) => {
  const insert = useCallback(async (data: any) => {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }, [table]);

  const update = useCallback(async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }, [table]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }, [table]);

  return { insert, update, remove };
};
