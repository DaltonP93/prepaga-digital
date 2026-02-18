import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Menu, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMenuConfig,
  useSaveMenuConfig,
  MenuConfigMap,
  MENU_ITEMS,
  CONFIGURABLE_ROLES,
  DEFAULT_CONFIG,
} from '@/hooks/useMenuConfig';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  auditor: 'Auditor',
  gestor: 'Gestor',
  vendedor: 'Vendedor',
};

export function MenuConfigPanel() {
  const { data: savedConfig, isLoading } = useMenuConfig();
  const saveConfig = useSaveMenuConfig();
  const [localConfig, setLocalConfig] = useState<MenuConfigMap>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (savedConfig) {
      // Merge saved config with defaults to ensure all keys exist
      const merged = { ...DEFAULT_CONFIG };
      for (const key of Object.keys(savedConfig)) {
        if (merged[key]) {
          merged[key] = { ...merged[key], ...savedConfig[key] };
        }
      }
      setLocalConfig(merged);
    }
  }, [savedConfig]);

  const handleToggle = (menuKey: string, role: string) => {
    setLocalConfig(prev => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [role]: !prev[menuKey]?.[role],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(localConfig);
      setHasChanges(false);
      toast.success('Configuracion de menu guardada');
    } catch {
      toast.error('Error al guardar la configuracion');
    }
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const configurableItems = MENU_ITEMS.filter(
    item => !('alwaysVisible' in item && item.alwaysVisible) && !('superAdminOnly' in item && item.superAdminOnly)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              Visibilidad del Menu por Rol
            </CardTitle>
            <CardDescription>
              Configura que opciones del menu lateral ve cada rol. Super Admin siempre ve todo.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saveConfig.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saveConfig.isPending}
            >
              {saveConfig.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasChanges && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-700">
            Hay cambios sin guardar
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">Opcion del Menu</th>
                {CONFIGURABLE_ROLES.map(role => (
                  <th key={role} className="text-center py-2 px-2 font-medium">
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_LABELS[role]}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configurableItems.map(item => (
                <tr key={item.key} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium">{item.label}</td>
                  {CONFIGURABLE_ROLES.map(role => (
                    <td key={role} className="text-center py-2 px-2">
                      <Checkbox
                        checked={localConfig[item.key]?.[role] ?? false}
                        onCheckedChange={() => handleToggle(item.key, role)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Dashboard y Mi Perfil son siempre visibles. Empresas solo es visible para Super Admin.
        </p>
      </CardContent>
    </Card>
  );
}
