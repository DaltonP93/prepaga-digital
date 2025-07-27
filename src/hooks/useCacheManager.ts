
import { useEffect, useCallback } from 'react';
import { CacheManager } from '@/utils/cacheManager';

export const useCacheManager = () => {
  const cacheManager = CacheManager.getInstance();

  // Ejecutar limpieza automática al cargar
  useEffect(() => {
    cacheManager.checkAndCleanExpiredCache();
  }, []);

  // Limpiar cache cada 30 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      cacheManager.clearLocalStorageIfNeeded();
      cacheManager.clearImageCache();
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, []);

  // Detectar problemas de memoria
  useEffect(() => {
    const handleMemoryWarning = () => {
      console.warn('Advertencia de memoria detectada, limpiando cache...');
      cacheManager.forceFullCleanup();
    };

    // Detectar cuando la página se está quedando sin memoria
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (message?.toString().includes('out of memory') || 
          message?.toString().includes('Maximum call stack')) {
        handleMemoryWarning();
      }
      
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    return () => {
      window.onerror = originalError;
    };
  }, []);

  const clearCache = useCallback(async () => {
    await cacheManager.forceFullCleanup();
    window.location.reload();
  }, []);

  const checkCacheStatus = useCallback(() => {
    const totalSize = Object.keys(localStorage).reduce((total, key) => {
      return total + localStorage[key].length;
    }, 0);
    
    return {
      localStorageSize: totalSize,
      itemCount: Object.keys(localStorage).length,
      sessionStorageSize: Object.keys(sessionStorage).length
    };
  }, []);

  return {
    clearCache,
    checkCacheStatus
  };
};
