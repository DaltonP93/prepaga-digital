import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link, Copy, Send, CheckCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';

interface SignatureLinkGeneratorProps {
  saleId: string;
  clientEmail?: string;
  clientPhone?: string;
}

export const SignatureLinkGenerator: React.FC<SignatureLinkGeneratorProps> = ({
  saleId,
  clientEmail,
  clientPhone,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expirationDays, setExpirationDays] = useState(7);

  // Fetch existing signature links
  const { data: signatureLinks = [], isLoading } = useQuery({
    queryKey: ['signature-links', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_links')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });

  // Generate new signature link
  const generateLink = useMutation({
    mutationFn: async (recipientType: string) => {
      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const { data, error } = await supabase
        .from('signature_links')
        .insert({
          sale_id: saleId,
          token,
          recipient_type: recipientType,
          recipient_email: clientEmail || null,
          recipient_phone: clientPhone || null,
          expires_at: expiresAt.toISOString(),
          status: 'pendiente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-links', saleId] });
      toast({
        title: 'Enlace generado',
        description: 'El enlace de firma ha sido creado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo generar el enlace.',
        variant: 'destructive',
      });
    },
  });

  // Copy link to clipboard
  const copyLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/firmar/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Enlace copiado',
      description: 'El enlace ha sido copiado al portapapeles.',
    });
  };

  // Resend notification
  const resendNotification = useMutation({
    mutationFn: async (linkId: string) => {
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      // Log the WhatsApp message
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          company_id: profile.company_id,
          phone_number: clientPhone || '',
          message_type: 'signature_request',
          message_body: `Recordatorio de firma - Enlace: ${window.location.origin}/firmar/${linkId}`,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Notificación enviada',
        description: 'Se ha enviado el recordatorio de firma.',
      });
    },
  });

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (isExpired) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    
    switch (status) {
      case 'completado':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Firmado</Badge>;
      case 'pendiente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'visualizado':
        return <Badge variant="outline" className="text-blue-600">Visualizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Enlaces de Firma Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate New Link Section */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <h4 className="font-medium">Generar nuevo enlace</h4>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="expiration">Días de validez</Label>
              <Input
                id="expiration"
                type="number"
                min={1}
                max={30}
                value={expirationDays}
                onChange={(e) => setExpirationDays(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Button
              onClick={() => generateLink.mutate('cliente')}
              disabled={generateLink.isPending}
            >
              <Link className="h-4 w-4 mr-2" />
              Generar Enlace para Cliente
            </Button>
          </div>
        </div>

        {/* Existing Links */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Cargando enlaces...
          </p>
        ) : signatureLinks.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium">Enlaces existentes</h4>
            {signatureLinks.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{link.recipient_type}</span>
                    {getStatusBadge(link.status, link.expires_at)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Creado: {formatDate(link.created_at)}</p>
                    <p>Expira: {formatDate(link.expires_at)}</p>
                    {link.access_count > 0 && (
                      <p>Accesos: {link.access_count}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(link.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/firmar/${link.token}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {link.status === 'pendiente' && clientPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendNotification.mutate(link.id)}
                      disabled={resendNotification.isPending}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay enlaces de firma generados
          </p>
        )}
      </CardContent>
    </Card>
  );
};
