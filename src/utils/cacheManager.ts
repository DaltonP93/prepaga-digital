
export class CacheManager {
  private static instance: CacheManager;
  private readonly CACHE_VERSION = 'v1.0.0';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Limpiar cache obsoleto del navegador
  async clearObsoleteCache(): Promise<void> {
    try {
      const keys = await caches.keys();
      const obsoleteKeys = keys.filter(key => !key.includes(this.CACHE_VERSION));
      
      await Promise.all(
        obsoleteKeys.map(key => caches.delete(key))
      );
      
      console.log('Cache obsoleto limpiado:', obsoleteKeys.length);
    } catch (error) {
      console.error('Error limpiando cache obsoleto:', error);
    }
  }

  // Limpiar localStorage si supera el límite
  clearLocalStorageIfNeeded(): void {
    try {
      const totalSize = this.getLocalStorageSize();
      
      if (totalSize > this.MAX_CACHE_SIZE) {
        const itemsToRemove = this.getOldestLocalStorageItems();
        itemsToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        console.log('LocalStorage limpiado:', itemsToRemove.length, 'items');
      }
    } catch (error) {
      console.error('Error limpiando localStorage:', error);
    }
  }

  private getLocalStorageSize(): number {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length;
      }
    }
    return totalSize;
  }

  private getOldestLocalStorageItems(): string[] {
    const items: Array<{key: string, timestamp: number}> = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        try {
          const item = JSON.parse(localStorage[key]);
          if (item.timestamp) {
            items.push({ key, timestamp: item.timestamp });
          }
        } catch {
          // Si no se puede parsear, es un item viejo
          items.push({ key, timestamp: 0 });
        }
      }
    }
    
    // Ordenar por timestamp y devolver los más viejos
    items.sort((a, b) => a.timestamp - b.timestamp);
    return items.slice(0, Math.floor(items.length / 2)).map(item => item.key);
  }

  // Limpiar cache de imágenes en memoria
  clearImageCache(): void {
    try {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });
    } catch (error) {
      console.error('Error limpiando cache de imágenes:', error);
    }
  }

  // Verificar y limpiar cache expirado
  async checkAndCleanExpiredCache(): Promise<void> {
    const now = Date.now();
    const lastCleanup = localStorage.getItem('lastCacheCleanup');
    
    if (!lastCleanup || now - parseInt(lastCleanup) > this.CACHE_EXPIRY) {
      await this.clearObsoleteCache();
      this.clearLocalStorageIfNeeded();
      this.clearImageCache();
      localStorage.setItem('lastCacheCleanup', now.toString());
    }
  }

  // Forzar limpieza completa
  async forceFullCleanup(): Promise<void> {
    try {
      // Limpiar todos los caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Limpiar localStorage selectivo (mantener datos importantes)
      const importantKeys = ['auth-session', 'user-preferences', 'theme'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!importantKeys.some(important => key.includes(important))) {
          localStorage.removeItem(key);
        }
      });
      
      // Limpiar sessionStorage
      sessionStorage.clear();
      
      console.log('Limpieza completa de cache realizada');
    } catch (error) {
      console.error('Error en limpieza completa:', error);
    }
  }
}
