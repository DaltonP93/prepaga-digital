import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, BarChart3 } from 'lucide-react';
import {
  useSaleProgressConfig,
  DEFAULT_PROGRESS_CONFIG,
  PROGRESS_STATUS_LABELS,
} from '@/hooks/useSaleProgressConfig';

export const SaleProgressConfigPanel: React.FC = () => {
  const { progressConfig, isLoading, updateConfig, isUpdating } = useSaleProgressConfig();
  const [localConfig, setLocalConfig] = useState<Record<string, number>>(DEFAULT_PROGRESS_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLocalConfig({ ...DEFAULT_PROGRESS_CONFIG, ...progressConfig });
    }
  }, [progressConfig, isLoading]);

  const handleChange = (status: string, value: string) => {
    const num = Math.min(100, Math.max(0, parseInt(value) || 0));
    setLocalConfig(prev => ({ ...prev, [status]: num }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateConfig(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalConfig({ ...DEFAULT_PROGRESS_CONFIG });
    setHasChanges(true);
  };

  const getBarColor = (value: number): string => {
    if (value >= 95) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 30) return 'bg-yellow-500';
    if (value > 0) return 'bg-muted-foreground/50';
    return 'bg-destructive/50';
  };

  const orderedStatuses = [
    'borrador',
    'preparando_documentos',
    'esperando_ddjj',
    'pendiente',
    'en_auditoria',
    'rechazado',
    'aprobado_para_templates',
    'listo_para_enviar',
    'enviado',
    'firmado_parcial',
    'firmado',
    'completado',
    'cancelado',
    'expirado',
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Progreso por Estado
            </CardTitle>
            <CardDescription>
              Define el porcentaje de progreso que se muestra en la lista de ventas para cada estado.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isUpdating}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
            >
              <Save className="h-4 w-4 mr-1" />
              {isUpdating ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {orderedStatuses.map((status) => {
            const value = localConfig[status] ?? 0;
            return (
              <div
                key={status}
                className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="w-48 shrink-0">
                  <Label className="text-sm font-medium">
                    {PROGRESS_STATUS_LABELS[status] || status}
                  </Label>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`${getBarColor(value)} h-3 rounded-full transition-all`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) => handleChange(status, e.target.value)}
                      className="h-8 text-center text-sm"
                    />
                  </div>
                  <Badge variant="outline" className="w-12 justify-center text-xs">
                    {value}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
