import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSignatureAutomation } from '@/hooks/useSignatureAutomation';
import { 
  Clock, 
  Zap, 
  Settings, 
  Play, 
  Pause,
  Mail,
  FileText,
  Calendar,
  Bot
} from 'lucide-react';
import { useState } from 'react';

export const AutomationManager = () => {
  const [reminderHours, setReminderHours] = useState(24);
  const [autoResend, setAutoResend] = useState(true);
  const [dailyReports, setDailyReports] = useState(false);
  
  const {
    sendAutomaticReminders,
    resendExpiredSignatures,
    generateBulkDocuments,
    scheduleAutomation,
    isProcessing
  } = useSignatureAutomation();

  const automationRules = [
    {
      id: 'reminder',
      name: 'Recordatorios Automáticos',
      description: 'Envía recordatorios antes de que expiren las firmas',
      icon: Clock,
      status: 'active',
      lastRun: '2 horas',
      nextRun: '22 horas'
    },
    {
      id: 'resend',
      name: 'Reenvío de Enlaces Expirados',
      description: 'Regenera y reenvía enlaces cuando expiran',
      icon: Mail,
      status: 'active',
      lastRun: '1 día',
      nextRun: '6 horas'
    },
    {
      id: 'reports',
      name: 'Reportes Diarios',
      description: 'Envía resumen diario de firmas pendientes',
      icon: FileText,
      status: 'inactive',
      lastRun: 'Nunca',
      nextRun: 'Pausado'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Acciones Inmediatas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Acciones Inmediatas
          </CardTitle>
          <CardDescription>
            Ejecuta automatizaciones manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => sendAutomaticReminders.mutate()}
              disabled={isProcessing}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <Clock className="h-6 w-6" />
              <span>Enviar Recordatorios</span>
              <span className="text-xs opacity-70">Firmas que expiran pronto</span>
            </Button>
            
            <Button 
              onClick={() => resendExpiredSignatures.mutate()}
              disabled={isProcessing}
              variant="outline"
              className="h-auto p-4 flex flex-col gap-2"
            >
              <Mail className="h-6 w-6" />
              <span>Reenviar Expirados</span>
              <span className="text-xs opacity-70">Enlaces caducados</span>
            </Button>
            
            <Button 
              onClick={() => generateBulkDocuments.mutate([])}
              disabled={isProcessing}
              variant="outline"
              className="h-auto p-4 flex flex-col gap-2"
            >
              <FileText className="h-6 w-6" />
              <span>Generar Documentos</span>
              <span className="text-xs opacity-70">Contratos pendientes</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reglas de Automatización */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Reglas de Automatización
          </CardTitle>
          <CardDescription>
            Configura y gestiona automatizaciones programadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <rule.icon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Última ejecución: {rule.lastRun}</span>
                      <span>Próxima: {rule.nextRun}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={rule.status === 'active' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {rule.status === 'active' ? (
                      <Play className="h-3 w-3" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                    {rule.status === 'active' ? 'Activo' : 'Pausado'}
                  </Badge>
                  
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Automatización */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración Global
          </CardTitle>
          <CardDescription>
            Ajusta los parámetros generales de automatización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="reminder-hours">Horas antes de expiración para recordatorios</Label>
                <Input
                  id="reminder-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={reminderHours}
                  onChange={(e) => setReminderHours(Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se enviarán recordatorios {reminderHours} horas antes de que expire el enlace
                </p>
              </div>
              
              <div>
                <Label>Frecuencia de verificación</Label>
                <Select defaultValue="hourly">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Una vez al día</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Reenvío automático de enlaces expirados</Label>
                  <p className="text-xs text-muted-foreground">
                    Regenera enlaces automáticamente cuando expiran
                  </p>
                </div>
                <Switch
                  checked={autoResend}
                  onCheckedChange={setAutoResend}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Reportes diarios por email</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibe un resumen diario de firmas pendientes
                  </p>
                </div>
                <Switch
                  checked={dailyReports}
                  onCheckedChange={setDailyReports}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline">
              Resetear configuración
            </Button>
            <Button>
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas de Automatización */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Automatización</CardTitle>
          <CardDescription>
            Rendimiento de las automatizaciones en los últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">127</div>
              <div className="text-sm text-muted-foreground">Recordatorios enviados</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">89</div>
              <div className="text-sm text-muted-foreground">Enlaces regenerados</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">45</div>
              <div className="text-sm text-muted-foreground">Documentos generados</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">98.2%</div>
              <div className="text-sm text-muted-foreground">Tasa de éxito</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};