
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCacheManager } from '@/hooks/useCacheManager';
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

export const CacheMonitor: React.FC = () => {
  const { clearCache, checkCacheStatus } = useCacheManager();
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setCacheStatus(checkCacheStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Actualizar cada 10 segundos

    return () => clearInterval(interval);
  }, [checkCacheStatus]);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearCache();
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCacheStatusColor = () => {
    if (!cacheStatus) return 'secondary';
    
    const sizeInMB = cacheStatus.localStorageSize / (1024 * 1024);
    if (sizeInMB > 40) return 'destructive';
    if (sizeInMB > 20) return 'default';
    return 'secondary';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Monitor de Cache
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cacheStatus && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tamaño del cache:</span>
              <Badge variant={getCacheStatusColor()}>
                {formatBytes(cacheStatus.localStorageSize)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Items almacenados:</span>
              <Badge variant="outline">{cacheStatus.itemCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sesión temporal:</span>
              <Badge variant="outline">{cacheStatus.sessionStorageSize}</Badge>
            </div>
          </div>
        )}

        {cacheStatus && cacheStatus.localStorageSize > 20 * 1024 * 1024 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Cache grande detectado. Considera limpiarlo.
            </span>
          </div>
        )}

        <Button 
          onClick={handleClearCache}
          disabled={isClearing}
          className="w-full"
          variant="outline"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isClearing ? 'Limpiando...' : 'Limpiar Cache'}
        </Button>
      </CardContent>
    </Card>
  );
};
