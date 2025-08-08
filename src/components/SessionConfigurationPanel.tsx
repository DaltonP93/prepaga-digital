
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Clock, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SessionConfig {
  enabled: boolean;
  timeoutMinutes: number;
  warningMinutes: number;
  showWarnings: boolean;
  clearDataOnTimeout: boolean;
}

export const SessionConfigurationPanel = () => {
  const [config, setConfig] = useState<SessionConfig>({
    enabled: true,
    timeoutMinutes: 30,
    warningMinutes: 5,
    showWarnings: true,
    clearDataOnTimeout: true
  });

  useEffect(() => {
    // Cargar configuración guardada
    const savedConfig = localStorage.getItem('session-config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading session config:', error);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem('session-config', JSON.stringify(config));
      toast.success('Configuración de sesión guardada correctamente');
      
      // Disparar evento para que otros componentes actualicen su configuración
      window.dispatchEvent(new CustomEvent('session-config-updated', { detail: config }));
    } catch (error) {
      console.error('Error saving session config:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  const updateConfig = (field: keyof SessionConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const timeoutOptions = [
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 120, label: '2 horas' },
    { value: 240, label: '4 horas' },
    { value: 480, label: '8 horas' },
  ];

  const warningOptions = [
    { value: 2, label: '2 minutos antes' },
    { value: 5, label: '5 minutos antes' },
    { value: 10, label: '10 minutos antes' },
    { value: 15, label: '15 minutos antes' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base font-medium">Gestión automática de sesión</Label>
          <p className="text-sm text-muted-foreground">
            Cerrar sesión automáticamente por inactividad
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => updateConfig('enabled', enabled)}
        />
      </div>

      {config.enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="timeout">Tiempo de inactividad</Label>
            <Select
              value={config.timeoutMinutes.toString()}
              onValueChange={(value) => updateConfig('timeoutMinutes', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeoutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warning">Advertencia antes del cierre</Label>
            <Select
              value={config.warningMinutes.toString()}
              onValueChange={(value) => updateConfig('warningMinutes', parseInt(value))}
              disabled={!config.showWarnings}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warningOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mostrar advertencias</Label>
              <p className="text-sm text-muted-foreground">
                Avisar antes de cerrar la sesión
              </p>
            </div>
            <Switch
              checked={config.showWarnings}
              onCheckedChange={(showWarnings) => updateConfig('showWarnings', showWarnings)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Limpiar datos al cerrar</Label>
              <p className="text-sm text-muted-foreground">
                Borrar cache y datos locales
              </p>
            </div>
            <Switch
              checked={config.clearDataOnTimeout}
              onCheckedChange={(clearData) => updateConfig('clearDataOnTimeout', clearData)}
            />
          </div>

          {config.clearDataOnTimeout && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Se eliminarán todos los datos guardados localmente al cerrar sesión automáticamente.
              </span>
            </div>
          )}
        </>
      )}

      <Button onClick={handleSave} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        Guardar Configuración
      </Button>
    </div>
  );
};
