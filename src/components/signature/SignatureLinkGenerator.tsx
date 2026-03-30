import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Link, Copy, Send, CheckCircle, Clock, ExternalLink, RefreshCw, PenTool, Building2, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useSignWellConfig, useSignWellCreateDocument } from '@/hooks/useSignWell';
import { useCreateAllSignatureLinks } from '@/hooks/useCreateAllSignatureLinks';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { generateUUID } from '@/lib/utils';
import { getSignatureLinkPath, getSignatureLinkUrl } from '@/lib/appUrls';

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
  const [expirationDays, setExpirationDays] = useState(1);
  const { isEnabled: signwellEnabled } = useSignWellConfig();
  const signwellCreate = useSignWellCreateDocument();
  const createAllLinks = useCreateAllSignatureLinks();
  const { data: beneficiaries = [] } = useBeneficiaries(saleId);

  // Fetch contratada config
  const { data: contratadaConfig } = useQuery({
    queryKey: ['contratada-config', saleId],
    queryFn: async () => {
      const { data: sale } = await supabase
        .from('sales')
        .select('company_id')
        .eq('id', saleId)
        .single();
      if (!sale?.company_id) return null;

      const { data } = await supabase
        .from('company_settings')
        .select('contratada_signature_mode, contratada_signer_name, contratada_signer_email, contratada_signer_dni, contratada_signer_phone')
        .eq('company_id', sale.company_id)
        .single();
      return data;
    },
    enabled: !!saleId,
  });

  // Fetch existing signature links
  const { data: signatureLinks = [], isLoading } = useQuery({
    queryKey: ['signature-links', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_links')
        .select('*')
        .eq('sale_id', saleId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });

  // Generate single link (for individual buttons)
  const generateLink = useMutation({
    mutationFn: async (recipientType: string) => {
      const token = generateUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (recipientType === 'contratada' ? 3 : expirationDays));

      const isContratada = recipientType === 'contratada';

      const insertData: Record<string, any> = {
        sale_id: saleId,
        token,
        recipient_type: isContratada ? 'contratada' : recipientType,
        recipient_email: isContratada ? (contratadaConfig?.contratada_signer_email || null) : (clientEmail || null),
        recipient_phone: isContratada ? (contratadaConfig?.contratada_signer_phone || null) : (clientPhone || null),
        expires_at: expiresAt.toISOString(),
        status: 'pendiente',
        step_order: isContratada ? 2 : 1,
        is_active: !isContratada,
      };

      const { data, error } = await supabase
        .from('signature_links')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signature-links', saleId] });
      const isContratada = (data as any).recipient_type === 'contratada';
      toast({
        title: isContratada ? 'Enlace para Contratada generado' : 'Enlace generado',
        description: isContratada
          ? 'Se generó el enlace de firma para el representante de la empresa (se activará cuando el titular firme).'
          : 'El enlace de firma ha sido creado exitosamente.',
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

  // Activate contratada link manually
  const activateLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('signature_links')
        .update({ is_active: true } as any)
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-links', saleId] });
      toast({ title: 'Enlace activado', description: 'El enlace de la contratada ha sido activado para firma.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo activar el enlace.', variant: 'destructive' });
    },
  });

  const copyLink = (token: string) => {
    const link = getSignatureLinkUrl(token);
    navigator.clipboard.writeText(link);
    toast({ title: 'Enlace copiado', description: 'El enlace ha sido copiado al portapapeles.' });
  };

  // Resend notification
  const resendNotification = useMutation({
    mutationFn: async (linkData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
      if (!profile?.company_id) throw new Error('No company found');

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*, clients(*), companies(*)')
        .eq('id', saleId)
        .single();
      if (saleError || !sale) throw new Error('Venta no encontrada');

      const link = getSignatureLinkUrl(linkData.token);
      const expirationDate = new Date(linkData.expires_at).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      const isContratada = linkData.recipient_type === 'contratada';
      const phone = isContratada
        ? (linkData.recipient_phone || contratadaConfig?.contratada_signer_phone)
        : sale.clients?.phone;
      const name = isContratada
        ? (contratadaConfig?.contratada_signer_name || 'Representante')
        : `${sale.clients?.first_name} ${sale.clients?.last_name}`;

      if (!phone) throw new Error('No se encontró número de teléfono');

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: phone,
          templateName: 'reminder',
          templateData: {
            clientName: name,
            companyName: sale.companies?.name || 'SAMAP',
            signatureUrl: link,
            expirationDate,
          },
          saleId,
          companyId: profile.company_id,
          messageType: 'reminder',
        },
      });

      if (error) throw new Error(error.message || 'Error al enviar mensaje de WhatsApp');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Notificación enviada', description: 'Se ha enviado el recordatorio por WhatsApp.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'No se pudo enviar la notificación.', variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string, expiresAt: string, isActive?: boolean) => {
    const isExpired = new Date(expiresAt) < new Date();
    if (isExpired) return <Badge variant="destructive">Expirado</Badge>;
    if (isActive === false && status === 'pendiente') {
      return (
        <Badge variant="outline" className="text-orange-500 border-orange-300">
          <Clock className="h-3 w-3 mr-1" />
          Esperando turno
        </Badge>
      );
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

  const getRecipientLabel = (recipientType: string) => {
    switch (recipientType) {
      case 'titular': return 'Titular';
      case 'adherente': return 'Adherente';
      case 'contratada': return 'Contratada (Empresa)';
      case 'cliente': return 'Cliente';
      default: return recipientType;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const hasContratadaLink = signatureLinks.some((l: any) => l.recipient_type === 'contratada');
  const hasAnyLinks = signatureLinks.length > 0;
  const showContratadaButton = contratadaConfig?.contratada_signature_mode === 'link'
    && contratadaConfig?.contratada_signer_email
    && !hasContratadaLink;

  const hasBeneficiaries = beneficiaries.length > 0;
  const showGenerateAllButton = !hasAnyLinks;
  const allStep1Completed = signatureLinks
    .filter((l: any) => l.step_order === 1 && l.status !== 'revocado')
    .every((l: any) => l.status === 'completado') && signatureLinks.some((l: any) => l.step_order === 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Enlaces de Firma Digital
          {signwellEnabled && (
            <Badge variant="default" className="bg-green-600 text-xs">
              <PenTool className="h-3 w-3 mr-1" />
              SignWell activo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate All Links Section */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <h4 className="font-medium">Generar enlaces de firma</h4>

          {showGenerateAllButton && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Genera todos los enlaces de firma en un solo paso: Titular
                {hasBeneficiaries ? `, ${beneficiaries.length} Adherente(s)` : ''}
                {contratadaConfig?.contratada_signature_mode === 'link' ? ' y Contratada (Empresa)' : ''}.
              </p>
              {contratadaConfig?.contratada_signature_mode === 'link' && contratadaConfig?.contratada_signer_name && (
                <p className="text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  Representante: {contratadaConfig.contratada_signer_name} ({contratadaConfig.contratada_signer_email})
                  — El enlace de la contratada se activará automáticamente cuando el titular firme.
                </p>
              )}
              <Button
                onClick={() => createAllLinks.mutate({ saleId })}
                disabled={createAllLinks.isPending}
                className="w-full sm:w-auto"
              >
                {createAllLinks.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                {createAllLinks.isPending ? 'Generando...' : 'Generar Todos los Enlaces'}
              </Button>
            </div>
          )}

          {hasAnyLinks && (
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[100px]">
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
                variant="outline"
                onClick={() => generateLink.mutate('cliente')}
                disabled={generateLink.isPending}
                size="sm"
              >
                <Link className="h-4 w-4 mr-2" />
                + Enlace Cliente
              </Button>
              {showContratadaButton && (
                <Button
                  variant="secondary"
                  onClick={() => generateLink.mutate('contratada')}
                  disabled={generateLink.isPending}
                  size="sm"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  + Enlace Contratada
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Existing Links */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cargando enlaces...</p>
        ) : signatureLinks.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium">Enlaces generados ({signatureLinks.length})</h4>
            {signatureLinks.map((link: any) => {
              const isInactive = link.is_active === false && link.status === 'pendiente';

              return (
                <div key={link.id} className={`p-4 border rounded-lg ${isInactive ? 'bg-muted/40 border-dashed' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getRecipientLabel(link.recipient_type)}</span>
                        {getStatusBadge(link.status, link.expires_at, link.is_active)}
                        {link.recipient_type === 'contratada' && (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            Paso 2
                          </Badge>
                        )}
                        {link.signwell_document_id && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            <PenTool className="h-3 w-3 mr-1" />
                            SignWell
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Creado: {formatDate(link.created_at)}</p>
                        <p>Expira: {formatDate(link.expires_at)}</p>
                        {link.recipient_email && <p>Email: {link.recipient_email}</p>}
                        {link.recipient_phone && <p>Tel: {link.recipient_phone}</p>}
                        {link.access_count > 0 && <p>Accesos: {link.access_count}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyLink(link.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(getSignatureLinkPath(link.token), '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {link.status === 'pendiente' && link.is_active !== false && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendNotification.mutate(link)}
                          disabled={resendNotification.isPending}
                          title="Reenviar notificación por WhatsApp"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline "not yet available" message for inactive links */}
                  {isInactive && (
                    <Alert className="mt-3 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <AlertDescription className="text-sm text-orange-700 dark:text-orange-300">
                        {allStep1Completed ? (
                          <>
                            <strong>Todos los firmantes anteriores completaron su firma.</strong>
                            <br />
                            <span className="text-xs">Este enlace debería haberse activado automáticamente. Puede activarlo manualmente.</span>
                            <br />
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => activateLink.mutate(link.id)}
                              disabled={activateLink.isPending}
                            >
                              {activateLink.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              Activar enlace
                            </Button>
                          </>
                        ) : (
                          <>
                            <strong>Enlace aún no disponible</strong>
                            <br />
                            Este enlace de firma se activará cuando el firmante anterior complete su proceso.
                            <br />
                            <span className="text-xs">Recibirá una notificación cuando sea su turno de firmar.</span>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
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
