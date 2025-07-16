import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  Bell, 
  Calendar,
  User,
  FileText,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSales } from '@/hooks/useSales';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SignatureWorkflowManagerProps {
  saleId?: string;
}

export const SignatureWorkflowManager = ({ saleId }: SignatureWorkflowManagerProps) => {
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const { data: sales } = useSales();
  const { toast } = useToast();

  // Estados de flujo de firma
  const getSignatureStatus = (sale: any) => {
    if (sale.status === 'firmado') return 'completed';
    if (sale.signature_token && sale.signature_expires_at) {
      const now = new Date();
      const expires = new Date(sale.signature_expires_at);
      if (now > expires) return 'expired';
      return 'pending';
    }
    return 'not_sent';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-blue-600 bg-blue-50';
      case 'expired': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      default: return <Send className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Firmado';
      case 'pending': return 'Pendiente';
      case 'expired': return 'Expirado';
      default: return 'Sin enviar';
    }
  };

  const calculateProgress = () => {
    if (!sales) return 0;
    const completed = sales.filter(sale => getSignatureStatus(sale) === 'completed').length;
    return (completed / sales.length) * 100;
  };

  const getWorkflowStats = () => {
    if (!sales) return { total: 0, completed: 0, pending: 0, expired: 0, notSent: 0 };
    
    return sales.reduce((stats, sale) => {
      const status = getSignatureStatus(sale);
      stats.total++;
      switch (status) {
        case 'completed': stats.completed++; break;
        case 'pending': stats.pending++; break;
        case 'expired': stats.expired++; break;
        default: stats.notSent++; break;
      }
      return stats;
    }, { total: 0, completed: 0, pending: 0, expired: 0, notSent: 0 });
  };

  const stats = getWorkflowStats();

  const handleBulkAction = async (action: 'send' | 'remind' | 'cancel') => {
    const salesToProcess = selectedSales.length > 0 ? selectedSales : 
      sales?.filter(sale => getSignatureStatus(sale) === 'not_sent').map(s => s.id) || [];

    if (salesToProcess.length === 0) {
      toast({
        title: "Sin elementos para procesar",
        description: "Seleccione ventas o asegúrese de que hay ventas disponibles",
        variant: "destructive"
      });
      return;
    }

    try {
      // Aquí implementarías las acciones masivas
      switch (action) {
        case 'send':
          toast({
            title: "Enviando enlaces de firma",
            description: `Procesando ${salesToProcess.length} documentos...`
          });
          break;
        case 'remind':
          toast({
            title: "Enviando recordatorios", 
            description: `Enviando recordatorios a ${salesToProcess.length} clientes...`
          });
          break;
        case 'cancel':
          toast({
            title: "Cancelando firmas",
            description: `Cancelando ${salesToProcess.length} procesos de firma...`
          });
          break;
      }
      
      setSelectedSales([]);
    } catch (error) {
      toast({
        title: "Error en la operación",
        description: "No se pudo completar la acción solicitada",
        variant: "destructive"
      });
    }
  };

  const renderSaleWorkflow = (sale: any) => {
    const status = getSignatureStatus(sale);
    const expiresAt = sale.signature_expires_at ? new Date(sale.signature_expires_at) : null;
    const timeLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) : 0;

    return (
      <Card key={sale.id} className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {sale.clients?.first_name} {sale.clients?.last_name}
              </h4>
              <Badge className={`${getStatusColor(status)} flex items-center gap-1`}>
                {getStatusIcon(status)}
                {getStatusText(status)}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {sale.plans?.name}
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {sale.clients?.email}
              </div>
              {expiresAt && status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expira en {timeLeft}h - {format(expiresAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                </div>
              )}
            </div>

            {status === 'pending' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(10, (timeLeft / 168) * 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="checkbox"
              checked={selectedSales.includes(sale.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSales([...selectedSales, sale.id]);
                } else {
                  setSelectedSales(selectedSales.filter(id => id !== sale.id));
                }
              }}
              className="mt-1"
            />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Detalles del Flujo de Firma</DialogTitle>
                  <DialogDescription>
                    Estado completo del proceso de firma para {sale.clients?.first_name} {sale.clients?.last_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Estado</label>
                      <div className={`mt-1 px-3 py-2 rounded-md ${getStatusColor(status)} flex items-center gap-2`}>
                        {getStatusIcon(status)}
                        {getStatusText(status)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Última actividad</label>
                      <div className="mt-1 text-sm">
                        {format(new Date(sale.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    </div>
                  </div>
                  
                  {sale.signature_token && (
                    <div>
                      <label className="text-sm font-medium">Enlace de firma</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded font-mono text-sm break-all">
                        {`${window.location.origin}/signature/${sale.signature_token}`}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Acciones disponibles</label>
                    <div className="mt-2 flex gap-2">
                      {status === 'not_sent' && (
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Enviar para firma
                        </Button>
                      )}
                      {status === 'pending' && (
                        <Button size="sm" variant="outline">
                          <Bell className="h-4 w-4 mr-2" />
                          Enviar recordatorio
                        </Button>
                      )}
                      {status === 'expired' && (
                        <Button size="sm" variant="outline">
                          <Clock className="h-4 w-4 mr-2" />
                          Reenviar enlace
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dashboard de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Firmados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Expirados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sin enviar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.notSent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso general */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Firmas</CardTitle>
          <CardDescription>
            {stats.completed} de {stats.total} documentos firmados ({Math.round(calculateProgress())}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={calculateProgress()} className="w-full" />
        </CardContent>
      </Card>

      {/* Acciones masivas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Masivas</CardTitle>
          <CardDescription>
            {selectedSales.length > 0 
              ? `${selectedSales.length} elementos seleccionados`
              : 'Seleccione elementos o las acciones se aplicarán a documentos elegibles'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant="default"
              onClick={() => handleBulkAction('send')}
              disabled={stats.notSent === 0 && selectedSales.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar enlaces
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleBulkAction('remind')}
              disabled={stats.pending === 0 && selectedSales.length === 0}
            >
              <Bell className="h-4 w-4 mr-2" />
              Enviar recordatorios
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleBulkAction('cancel')}
              disabled={selectedSales.length === 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar procesos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Lista de ventas con workflow */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Flujos de Firma</h3>
        
        {!sales || sales.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No hay ventas disponibles</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sales.map(renderSaleWorkflow)}
          </div>
        )}
      </div>
    </div>
  );
};