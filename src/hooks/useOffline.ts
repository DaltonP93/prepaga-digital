import { useState, useEffect } from 'react';

interface OfflineData {
  clients: any[];
  sales: any[];
  documents: any[];
  templates: any[];
}

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    clients: [],
    sales: [],
    documents: [],
    templates: []
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      cacheCurrentData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar datos del localStorage al iniciar
    loadOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const cached = localStorage.getItem('offlineData');
      if (cached) {
        setOfflineData(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const cacheCurrentData = () => {
    try {
      // Aquí cachearías los datos actuales
      const dataToCache = {
        clients: JSON.parse(localStorage.getItem('cachedClients') || '[]'),
        sales: JSON.parse(localStorage.getItem('cachedSales') || '[]'),
        documents: JSON.parse(localStorage.getItem('cachedDocuments') || '[]'),
        templates: JSON.parse(localStorage.getItem('cachedTemplates') || '[]')
      };
      
      localStorage.setItem('offlineData', JSON.stringify(dataToCache));
      setOfflineData(dataToCache);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      // Aquí sincronizarías los datos offline con el servidor
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      
      for (const change of pendingChanges) {
        // Procesar cada cambio pendiente
        await processOfflineChange(change);
      }
      
      // Limpiar cambios pendientes después de sincronizar
      localStorage.removeItem('pendingChanges');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  const processOfflineChange = async (change: any) => {
    // Implementar lógica de sincronización específica
    console.log('Processing offline change:', change);
  };

  const saveOfflineChange = (change: any) => {
    try {
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      pendingChanges.push({
        ...change,
        timestamp: Date.now()
      });
      localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
    } catch (error) {
      console.error('Error saving offline change:', error);
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offlineData');
    localStorage.removeItem('pendingChanges');
    setOfflineData({
      clients: [],
      sales: [],
      documents: [],
      templates: []
    });
  };

  return {
    isOnline,
    offlineData,
    saveOfflineChange,
    clearOfflineData,
    syncOfflineData
  };
};