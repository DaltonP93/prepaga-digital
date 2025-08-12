
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Users, CheckCircle, Clock, Send, Eye, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SignatureWorkflow = () => {
  const { toast } = useToast();
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Fetch signature workflow data
  const { data: signatureData, isLoading, refetch } = useQuery({
    queryKey: ['signature-workflow'],
    queryFn: async () => {
      console.log('Fetching signature workflow data...');
      
      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, phone, email),
          plans:plan_id(name),
          profiles:salesperson_id(first_name, last_name),
          whatsapp_notifications(*),
          signatures(*)
        `)
        .in('status', ['pendiente', 'enviado', 'firmado'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching signature workflow:', error);
        throw error;
      }

      console.log('Signature workflow data:', sales);
      return sales || [];
    },
  });

  const sendWhatsAppNotification = async (saleId: string, clientPhone: string) => {
    try {
      const token = `sign_${saleId}_${Date.now()}`;
      const notificationUrl = `${window.location.origin}/sign/${token}`;
      
      const { error } = await supabase
        .from('whatsapp_notifications')
        .insert({
          sale_id: saleId,
          recipient_phone: clientPhone,
          message_content: 'Tienes un documento para firmar. Haz clic en el enlace para continuar.',
          notification_url: notificationUrl,
          status: 'sent'
        });

      if (error) throw error;

      // Update sale status
      await supabase
        .from('sales')
        .update({ status: 'enviado' })
        .eq('id', saleId);

      toast({
        title: 'Notificación enviada',
        description: 'Se ha enviado la notificación por WhatsApp al cliente.',
      });

      refetch();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la notificación.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="text-blue-600"><Send className="h-3 w-3 mr-1" />Enviado</Badge>;
      case 'firmado':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Firmado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    pendientes: signatureData?.filter(s => s.status === 'pendiente').length || 0,
    enviados: signatureData?.filter(s => s.status === 'enviado').length || 0,
    firmados: signatureData?.filter(s => s.status === 'firmado').length || 0,
    total: signatureData?.length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flujo de Firmas</h1>
        <p className="text-muted-foreground">
          Gestiona el proceso de firma de documentos de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendientes de Envío
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              Documentos listos para enviar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Enviados
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enviados}</div>
            <p className="text-xs text-muted-foreground">
              Esperando firma del cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Firmados
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.firmados}</div>
            <p className="text-xs text-muted-foreground">
              Proceso completado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Activos
            </CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              En proceso de firma
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos en Proceso de Firma</CardTitle>
          <CardDescription>
            Gestiona el envío y seguimiento de documentos para firma digital
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signatureData && signatureData.length > 0 ? (
            <div className="space-y-4">
              {signatureData.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">
                          {sale.clients?.first_name} {sale.clients?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Plan: {sale.plans?.name} | Vendedor: {sale.profiles?.first_name} {sale.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Contrato: {sale.contract_number} | Fecha: {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(sale.status)}
                    {sale.status === 'pendiente' && sale.clients?.phone && (
                      <Button
                        size="sm"
                        onClick={() => sendWhatsAppNotification(sale.id, sale.clients.phone)}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Enviar WhatsApp
                      </Button>
                    )}
                    {sale.status === 'enviado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSale(sale)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Estado
                      </Button>
                    )}
                    {sale.status === 'firmado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Descargar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileSignature className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay documentos en proceso
              </h3>
              <p className="text-muted-foreground mb-4">
                Los documentos pendientes de firma aparecerán aquí.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSale && (
        <Card>
          <CardHeader>
            <CardTitle>Seguimiento de Notificación</CardTitle>
            <CardDescription>
              Estado del proceso de firma para {selectedSale.clients?.first_name} {selectedSale.clients?.last_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedSale.whatsapp_notifications?.map((notification: any) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Notificación WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      Enviado: {new Date(notification.sent_at).toLocaleString()}
                    </p>
                    {notification.opened_at && (
                      <p className="text-sm text-green-600">
                        Abierto: {new Date(notification.opened_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={notification.status === 'sent' ? 'default' : 'secondary'}>
                    {notification.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignatureWorkflow;
