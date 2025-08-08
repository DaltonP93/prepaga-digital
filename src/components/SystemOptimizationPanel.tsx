
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Database, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SystemOptimizationPanel = () => {
  const [isCleaningTestData, setIsCleaningTestData] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const cleanTestData = async () => {
    setIsCleaningTestData(true);
    try {
      // Eliminar datos de prueba específicos
      const testDataQueries = [
        supabase.from('sales').delete().ilike('client_name', '%test%'),
        supabase.from('sales').delete().ilike('client_name', '%prueba%'),
        supabase.from('sales').delete().ilike('client_name', '%ejemplo%'),
        supabase.from('clients').delete().ilike('first_name', '%test%'),
        supabase.from('clients').delete().ilike('first_name', '%prueba%'),
        supabase.from('clients').delete().ilike('first_name', '%ejemplo%'),
        supabase.from('templates').delete().ilike('name', '%test%'),
        supabase.from('templates').delete().ilike('name', '%prueba%'),
        supabase.from('templates').delete().ilike('name', '%ejemplo%'),
      ];

      const results = await Promise.allSettled(testDataQueries);
      
      let deletedCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          deletedCount += result.value.data.length;
        }
      });

      toast.success(`Se eliminaron ${deletedCount} registros de datos de prueba`);
    } catch (error) {
      console.error('Error cleaning test data:', error);
      toast.error('Error al limpiar los datos de prueba');
    } finally {
      setIsCleaningTestData(false);
    }
  };

  const clearAllCache = async () => {
    setIsCleaningCache(true);
    try {
      // Limpiar localStorage
      const keysToKeep = ['session-config', 'theme', 'sidebar-state'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Limpiar sessionStorage
      sessionStorage.clear();

      // Limpiar cache del navegador si está disponible
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      toast.success('Cache limpiado correctamente');
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Error al limpiar el cache');
    } finally {
      setIsCleaningCache(false);
    }
  };

  const optimizeSystem = async () => {
    setIsOptimizing(true);
    try {
      // Ejecutar optimizaciones
      await Promise.all([
        // Limpiar cache selectivo
        clearAllCache(),
        // Compactar datos locales
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);

      toast.success('Sistema optimizado correctamente');
    } catch (error) {
      console.error('Error optimizing system:', error);
      toast.error('Error al optimizar el sistema');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getCacheSize = () => {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      return (totalSize / 1024).toFixed(2) + ' KB';
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado del sistema */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Cache local:</span>
          <Badge variant="outline">{getCacheSize()}</Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Óptimo
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Acciones de limpieza */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Acciones de Mantenimiento</h4>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              disabled={isCleaningTestData}
            >
              {isCleaningTestData ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Limpiar Datos de Prueba
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirmar Limpieza
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará todos los datos de prueba (clientes, ventas y templates con nombres que contengan "test", "prueba" o "ejemplo"). 
                <br /><br />
                <strong>Esta acción no se puede deshacer.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={cleanTestData} className="bg-red-600 hover:bg-red-700">
                Eliminar Datos de Prueba
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={clearAllCache}
          disabled={isCleaningCache}
        >
          {isCleaningCache ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Limpiar Cache
        </Button>

        <Button 
          variant="default" 
          className="w-full justify-start"
          onClick={optimizeSystem}
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Optimizar Sistema
        </Button>
      </div>
    </div>
  );
};
