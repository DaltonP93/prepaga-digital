import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2, Target, DollarSign, Users, TrendingDown, TrendingUp, BarChart3, GitBranch, PieChart } from 'lucide-react';
import {
  useAnalyticsConfig,
  KPI_LABELS,
  TAB_LABELS,
  type AnalyticsConfigType,
} from '@/hooks/useAnalyticsConfig';

const KPI_ICONS: Record<string, React.ElementType> = {
  conversionRate: Target,
  avgTicket: DollarSign,
  customerLifetime: Users,
  churnRate: TrendingDown,
  monthlyRecurring: TrendingUp,
};

const TAB_ICONS: Record<string, React.ElementType> = {
  trends: BarChart3,
  conversion: GitBranch,
  performance: Users,
  products: PieChart,
};

export const AnalyticsCustomizer: React.FC = () => {
  const { analyticsConfig, updateConfig, isUpdating } = useAnalyticsConfig();
  const [localConfig, setLocalConfig] = useState<AnalyticsConfigType>(analyticsConfig);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(analyticsConfig);
    setHasChanges(false);
  }, [analyticsConfig]);

  const toggleKpi = (key: string) => {
    setLocalConfig(prev => ({
      ...prev,
      kpis: { ...prev.kpis, [key]: !prev.kpis[key as keyof typeof prev.kpis] },
    }));
    setHasChanges(true);
  };

  const toggleTab = (key: string) => {
    setLocalConfig(prev => ({
      ...prev,
      tabs: { ...prev.tabs, [key]: !prev.tabs[key as keyof typeof prev.tabs] },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateConfig(localConfig);
    setHasChanges(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Settings2 className="h-3.5 w-3.5" />
          Personalizar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Personalizar Analytics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">KPIs visibles</h4>
            <div className="space-y-3">
              {Object.entries(KPI_LABELS).map(([key, label]) => {
                const Icon = KPI_ICONS[key] || Target;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Label>
                    <Switch
                      checked={localConfig.kpis[key as keyof typeof localConfig.kpis] ?? true}
                      onCheckedChange={() => toggleKpi(key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Secciones de gráficos</h4>
            <div className="space-y-3">
              {Object.entries(TAB_LABELS).map(([key, label]) => {
                const Icon = TAB_ICONS[key] || BarChart3;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Label>
                    <Switch
                      checked={localConfig.tabs[key as keyof typeof localConfig.tabs] ?? true}
                      onCheckedChange={() => toggleTab(key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
