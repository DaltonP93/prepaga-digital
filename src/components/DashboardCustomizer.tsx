import { useState } from 'react';
import { Settings, Eye, EyeOff, Grid, BarChart3, Users, Bell, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';

const WIDGET_TYPES = {
  'sales_overview': { name: 'Resumen de Ventas', icon: BarChart3, description: 'Estadísticas generales de ventas' },
  'recent_clients': { name: 'Clientes Recientes', icon: Users, description: 'Últimos clientes agregados' },
  'notifications': { name: 'Notificaciones', icon: Bell, description: 'Centro de notificaciones' },
  'quick_actions': { name: 'Acciones Rápidas', icon: Zap, description: 'Botones de acceso rápido' },
  'analytics_chart': { name: 'Gráfico Analytics', icon: BarChart3, description: 'Análisis avanzado de datos' },
  'pending_documents': { name: 'Documentos Pendientes', icon: FileText, description: 'Documentos por firmar' }
};

const DashboardCustomizer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    widgets,
    isLoading,
    toggleWidgetVisibility,
    updateWidgetSize,
    isUpdating
  } = useDashboardWidgets();

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'small': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-green-100 text-green-800';
      case 'large': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return 'Pequeño';
      case 'medium': return 'Mediano';
      case 'large': return 'Grande';
      default: return size;
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Settings className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            Personalizar Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Widgets Disponibles</h3>
            <div className="grid gap-4">
              {widgets.map((widget) => {
                const widgetInfo = WIDGET_TYPES[widget.widget_type as keyof typeof WIDGET_TYPES];
                const Icon = widgetInfo?.icon || Grid;
                
                return (
                  <Card key={widget.id} className={`transition-opacity ${
                    !widget.visible ? 'opacity-50' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{widgetInfo?.name || widget.widget_type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {widgetInfo?.description || 'Widget personalizado'}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={getSizeColor(widget.size)}>
                                {getSizeLabel(widget.size)}
                              </Badge>
                              <Badge variant="outline">
                                Posición {widget.position + 1}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`size-${widget.id}`} className="text-sm">
                              Tamaño:
                            </Label>
                            <Select
                              value={widget.size}
                              onValueChange={(size) => updateWidgetSize(widget.id, size as any)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Pequeño</SelectItem>
                                <SelectItem value="medium">Mediano</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleWidgetVisibility(widget.id, !widget.visible)}
                              disabled={isUpdating}
                            >
                              {widget.visible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">Consejos:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Los widgets grandes ocupan todo el ancho disponible</li>
              <li>• Los widgets medianos ocupan la mitad del ancho</li>
              <li>• Los widgets pequeños ocupan un tercio del ancho</li>
              <li>• Puedes ocultar widgets que no necesites usando el botón del ojo</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardCustomizer;