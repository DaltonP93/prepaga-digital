
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Users, Send, Copy, Check, MessageCircle, Download, RefreshCw, Eye, Clock, CheckCircle, Info, Monitor, Smartphone, Tablet, Globe } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useSignatureLinks, useResendSignatureLink } from '@/hooks/useSignatureLinks';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSignatureLinkUrl } from '@/lib/appUrls';
import { toast } from 'sonner';

const formatDateTimePY = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const SignatureWorkflow = () => {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { profile } = useSimpleAuthContext();
  const { role: effectiveRole, permissions } = useRolePermissions();

  const { data: sales = [], isLoading } = useSales();
  const { formatCurrency } = useCurrencySettings();
  const { data: signatureLinks = [], isLoading: linksLoading } = useSignatureLinks(saleId || '');
  const { data: beneficiaries = [] } = useBeneficiaries(saleId || '');
  const resendLink = useResendSignatureLink();
  const queryClient = useQueryClient();

  // Realtime subscription for signature_links updates
  useEffect(() => {
    if (!saleId) return;
    const channel = supabase
      .channel(`signature-links-${saleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signature_links', filter: `sale_id=eq.${saleId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['signature-links', saleId] });
          queryClient.invalidateQueries({ queryKey: ['signed-documents', saleId] });
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [saleId, queryClient]);

  // Fetch documents for this sale
  const { data: signedDocs = [] } = useQuery({
    queryKey: ['signed-documents', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  // Fetch workflow steps for detail view
  const { data: workflowSteps = [] } = useQuery({
    queryKey: ['signature-workflow-steps', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      // Get all signature link IDs for this sale
      const linkIds = signatureLinks?.map((l: any) => l.id) || [];
      if (linkIds.length === 0) return [];
      const { data, error } = await supabase
        .from('signature_workflow_steps')
        .select('*')
        .in('signature_link_id', linkIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId && signatureLinks && signatureLinks.length > 0,
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailLink, setDetailLink] = useState<any>(null);

  const selectedSale = saleId ? sales.find(s => s.id === saleId) : null;

  const getSignatureUrl = (linkToken: string) => {
    return getSignatureLinkUrl(linkToken);
  };

  const handleCopyLink = async (linkToken: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(getSignatureUrl(linkToken));
      setCopiedId(linkId);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleSendWhatsApp = (phone: string | null, linkToken: string, recipientName: string) => {
    const url = getSignatureUrl(linkToken);
    const message = encodeURIComponent(
      `Hola ${recipientName}, le enviamos el enlace para firmar los documentos de su contrato:\n\n${url}\n\nPor favor ingrese al enlace para revisar y firmar los documentos. Gracias.`
    );
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleResendLink = (link: any) => {
    resendLink.mutate({
      id: link.id,
      sale_id: link.sale_id,
      recipient_type: link.recipient_type,
      recipient_id: link.recipient_id,
      recipient_email: link.recipient_email || '',
      recipient_phone: link.recipient_phone,
    });
  };

  const handleDownloadContent = (doc: any) => {
    if (!doc?.content) return;
    const htmlContent = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${doc.name}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
  img { max-width: 280px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>${doc.content}</body>
</html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownloadSignedDocs = (link: any) => {
    // Find signed (final) documents for this recipient
    const recipientDocs = signedDocs.filter((doc: any) => {
      if (doc.document_type === 'firma') return false;
      if (!doc.is_final) return false;
      if (link.recipient_type === 'adherente' && link.recipient_id) {
        return doc.beneficiary_id === link.recipient_id;
      }
      return !doc.beneficiary_id;
    });

    if (recipientDocs.length === 0) {
      toast.error('No se encontraron documentos firmados');
      return;
    }

    recipientDocs.forEach((doc: any) => {
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      } else if (doc.content) {
        handleDownloadContent(doc);
      }
    });
  };

  const getRecipientLabel = (link: any) => {
    if (link.recipient_type === 'titular') {
      const client = selectedSale?.clients as any;
      return `Titular: ${client ? `${client.first_name} ${client.last_name}` : 'Sin datos'}`;
    }
    const beneficiary = beneficiaries?.find((b: any) => b.id === link.recipient_id);
    if (beneficiary) {
      return `Adherente: ${beneficiary.first_name} ${beneficiary.last_name}`;
    }
    return `Adherente: ${link.recipient_email || link.recipient_phone || 'Sin datos'}`;
  };

  const getRecipientPhone = (link: any) => {
    if (link.recipient_phone) return link.recipient_phone;
    if (link.recipient_type === 'titular') {
      const client = selectedSale?.clients as any;
      return client?.phone || null;
    }
    const beneficiary = beneficiaries?.find((b: any) => b.id === link.recipient_id);
    return beneficiary?.phone || null;
  };

  const getRecipientName = (link: any) => {
    if (link.recipient_type === 'titular') {
      const client = selectedSale?.clients as any;
      return client ? `${client.first_name} ${client.last_name}` : 'Cliente';
    }
    const beneficiary = beneficiaries?.find((b: any) => b.id === link.recipient_id);
    return beneficiary ? `${beneficiary.first_name} ${beneficiary.last_name}` : 'Adherente';
  };

  // Get the most recent active link for each recipient (skip revoked old ones)
  const getActiveLinks = (links: any[]) => {
    const byRecipient = new Map<string, any>();
    // Links come sorted by created_at DESC, so first match per recipient is newest
    for (const link of links) {
      const key = link.recipient_type === 'titular' ? 'titular' : `adherente-${link.recipient_id}`;
      if (!byRecipient.has(key)) {
        byRecipient.set(key, link);
      }
    }
    return Array.from(byRecipient.values());
  };

  const detectDevice = (userAgent: string | undefined) => {
    if (!userAgent) return { type: 'Desconocido', icon: Globe };
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad/i.test(ua)) return { type: 'Tablet', icon: Tablet };
    if (/mobile|android|iphone/i.test(ua)) return { type: 'Móvil', icon: Smartphone };
    return { type: 'Escritorio', icon: Monitor };
  };

  const getStepsForLink = (linkId: string) => {
    return workflowSteps.filter((s: any) => s.signature_link_id === linkId);
  };

  if (token) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Acceso publico al flujo de firmas</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!saleId || !selectedSale) {
    const isSeller = effectiveRole === 'vendedor';
    const canViewAllSales = permissions.sales.viewAll;

    const availableSales = sales.filter(sale =>
      ['enviado', 'firmado', 'completado'].includes(sale.status) ||
      (isSeller && sale.salesperson_id === profile?.id) ||
      canViewAllSales
    );

    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Flujo de Firmas</h1>
            <p className="text-muted-foreground">Gestiona el proceso de firma de documentos</p>
          </div>
          <Button onClick={() => navigate('/sales')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Ventas
          </Button>
        </div>
        <div className="grid gap-4">
          {availableSales.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No hay ventas disponibles para firma</p>
                <Button onClick={() => navigate('/sales')}>Ir a Ventas</Button>
              </CardContent>
            </Card>
          ) : (
            availableSales.map((sale) => (
              <Card key={sale.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/signature-workflow/${sale.id}`)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}
                      </CardTitle>
                      <CardDescription>
                        {sale.contract_number || sale.id.substring(0, 8)} • Plan: {sale.plans?.name || 'Sin plan'} • {formatCurrency(sale.total_amount || 0)}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      sale.status === 'completado' ? 'default' :
                      sale.status === 'firmado' ? 'secondary' :
                      sale.status === 'enviado' ? 'outline' :
                      'destructive'
                    }>
                      {sale.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <Button size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Gestionar Firma
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  const client = selectedSale.clients as any;
  const clientName = client ? `${client.first_name} ${client.last_name}` : 'Sin cliente';

  const titularLinks = getActiveLinks(signatureLinks?.filter((l: any) => l.recipient_type === 'titular') || []);
  const adherenteLinks = getActiveLinks(signatureLinks?.filter((l: any) => l.recipient_type === 'adherente') || []);

  function renderSignatureLinks(links: any[]) {
    if (linksLoading) {
      return <p className="text-muted-foreground text-center py-4">Cargando enlaces...</p>;
    }
    if (!links || links.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>No hay enlaces de firma generados.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {links.map((link: any) => {
          const isCompleted = link.status === 'completado';
          const isExpired = !isCompleted && new Date(link.expires_at) < new Date();
          const isRevoked = link.status === 'revocado';
          const isActive = !isCompleted && !isExpired && !isRevoked;
          const phone = getRecipientPhone(link);
          const name = getRecipientName(link);

          return (
            <div key={link.id} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{getRecipientLabel(link)}</p>
                </div>
                <Badge variant={
                  isCompleted ? 'default' :
                  isExpired || isRevoked ? 'destructive' :
                  link.status === 'visualizado' ? 'secondary' :
                  'outline'
                }>
                  {isCompleted ? '✓ Firmado' : isExpired ? 'Expirado' : isRevoked ? 'Revocado' : link.status === 'visualizado' ? 'Visualizado' : 'Pendiente'}
                </Badge>
              </div>

              {/* Timeline de rastreo */}
              <div className="flex items-center gap-1 text-xs">
                {/* Step 1: Creado */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <Clock className="h-3 w-3" />
                  <span>Creado: {formatDateTimePY(link.created_at)}</span>
                </div>
                <div className="w-4 h-px bg-border" />

                {/* Step 2: Visualizado */}
                {link.accessed_at ? (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Eye className="h-3 w-3" />
                    <span>Visto: {formatDateTimePY(link.accessed_at)} ({link.access_count}x)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground border">
                    <Eye className="h-3 w-3" />
                    <span>No visto</span>
                  </div>
                )}
                <div className="w-4 h-px bg-border" />

                {/* Step 3: Firmado */}
                {isCompleted && link.completed_at ? (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle className="h-3 w-3" />
                    <span>Firmado: {formatDateTimePY(link.completed_at)}</span>
                  </div>
                ) : isExpired ? (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                    <Clock className="h-3 w-3" />
                    <span>Expirado: {formatDateTimePY(link.expires_at)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground border">
                    <CheckCircle className="h-3 w-3" />
                    <span>Pendiente</span>
                  </div>
                )}
              </div>

              {/* 3 Botones: Copiar, WhatsApp, Reenviar (para enlaces activos) */}
              {isActive && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(link.token, link.id)}
                  >
                    {copiedId === link.id ? (
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedId === link.id ? 'Copiado' : 'Copiar Enlace'}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleSendWhatsApp(phone, link.token, name)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Enviar por WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResendLink(link)}
                    disabled={resendLink.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${resendLink.isPending ? 'animate-spin' : ''}`} />
                    Reenviar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setDetailLink(link); }}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Ver Detalles
                  </Button>
                </div>
              )}

              {/* Para expirados/revocados: solo Reenviar */}
              {(isExpired || isRevoked) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleResendLink(link)}
                    disabled={resendLink.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${resendLink.isPending ? 'animate-spin' : ''}`} />
                    Regenerar Enlace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setDetailLink(link); }}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Ver Detalles
                  </Button>
                </div>
              )}

              {/* Para completados: Descargar firmado */}
              {isCompleted && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadSignedDocs(link)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar Documento Firmado
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setDetailLink(link); }}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Ver Detalles
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Flujo de Firma</h1>
          <p className="text-muted-foreground">
            {clientName} • {selectedSale.contract_number || selectedSale.id.substring(0, 8)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/signature-workflow')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informacion de la Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium">Plan:</p>
                <p className="text-muted-foreground">{selectedSale.plans?.name || 'Sin plan'}</p>
              </div>
              <div>
                <p className="font-medium">Monto:</p>
                <p className="text-muted-foreground">{formatCurrency(selectedSale.total_amount || 0)}</p>
              </div>
              <div>
                <p className="font-medium">Estado:</p>
                <Badge>{selectedSale.status}</Badge>
              </div>
              <div>
                <p className="font-medium">Vendedor:</p>
                <p className="text-muted-foreground">
                  {selectedSale.salesperson ?
                    `${(selectedSale.salesperson as any).first_name} ${(selectedSale.salesperson as any).last_name}` :
                    'No asignado'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Firma del Titular ({titularLinks.length})
            </CardTitle>
            <CardDescription>
              El titular recibe todos los documentos (Contrato, DDJJ, Anexos) para revisar y firmar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderSignatureLinks(titularLinks)}
          </CardContent>
        </Card>

        {adherenteLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Firmas de Adherentes ({adherenteLinks.length})
              </CardTitle>
              <CardDescription>
                Cada adherente recibe unicamente su DDJJ de Salud para firmar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSignatureLinks(adherenteLinks)}
            </CardContent>
          </Card>
        )}

        {/* Documents section */}
        {signedDocs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Documentos ({signedDocs.length})
              </CardTitle>
              <CardDescription>
                Documentos generados y firmados disponibles para descarga
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signedDocs.map((doc: any) => {
                  const isSigned = doc.status === 'firmado' || doc.signed_at;
                  const beneficiary = doc.beneficiary_id
                    ? beneficiaries?.find((b: any) => b.id === doc.beneficiary_id)
                    : null;
                  const canDownload = doc.file_url || doc.content;

                  return (
                    <div key={doc.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.document_type || 'Documento'}
                            {beneficiary && ` • ${beneficiary.first_name} ${beneficiary.last_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isSigned ? 'default' : 'outline'}>
                          {isSigned ? '✓ Firmado' : 'Pendiente'}
                        </Badge>
                        {canDownload && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (doc.file_url) {
                                window.open(doc.file_url, '_blank');
                              } else {
                                handleDownloadContent(doc);
                              }
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Descargar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailLink} onOpenChange={(open) => !open && setDetailLink(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Detalles del Enlace de Firma
            </DialogTitle>
            <DialogDescription>
              {detailLink && getRecipientLabel(detailLink)}
            </DialogDescription>
          </DialogHeader>
          {detailLink && (
            <div className="space-y-4">
              {/* General Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant={detailLink.status === 'completado' ? 'default' : 'outline'}>
                    {detailLink.status === 'completado' ? '✓ Firmado' : detailLink.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Creado</p>
                  <p className="font-medium">{new Date(detailLink.created_at).toLocaleString('es-PY')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expira</p>
                  <p className="font-medium">{new Date(detailLink.expires_at).toLocaleString('es-PY')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accesos</p>
                  <p className="font-medium">{detailLink.access_count || 0} veces</p>
                </div>
                {detailLink.accessed_at && (
                  <div>
                    <p className="text-muted-foreground">Último acceso</p>
                    <p className="font-medium">{new Date(detailLink.accessed_at).toLocaleString('es-PY')}</p>
                  </div>
                )}
                {detailLink.completed_at && (
                  <div>
                    <p className="text-muted-foreground">Firmado el</p>
                    <p className="font-medium">{new Date(detailLink.completed_at).toLocaleString('es-PY')}</p>
                  </div>
                )}
              </div>

              {/* IP Addresses */}
              {detailLink.ip_addresses && (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> Direcciones IP
                  </p>
                  <div className="bg-muted rounded p-2 text-xs font-mono">
                    {Array.isArray(detailLink.ip_addresses)
                      ? detailLink.ip_addresses.join(', ')
                      : typeof detailLink.ip_addresses === 'string'
                        ? detailLink.ip_addresses
                        : JSON.stringify(detailLink.ip_addresses)
                    }
                  </div>
                </div>
              )}

              {/* Workflow Steps */}
              {(() => {
                const steps = getStepsForLink(detailLink.id);
                if (steps.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm font-medium mb-2">Historial de Actividad</p>
                    <div className="space-y-2">
                      {steps.map((step: any) => {
                        const stepData = step.data || {};
                        const device = detectDevice(stepData.user_agent);
                        const DeviceIcon = device.icon;
                        return (
                          <div key={step.id} className="border rounded p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px]">{step.step_type}</Badge>
                              <span className="text-muted-foreground">
                                {new Date(step.completed_at || step.created_at).toLocaleString('es-PY')}
                              </span>
                            </div>
                            {stepData.signed_ip && (
                              <p className="text-muted-foreground">IP: {stepData.signed_ip}</p>
                            )}
                            {stepData.user_agent && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <DeviceIcon className="h-3 w-3" />
                                <span>{device.type}</span>
                                <span className="truncate max-w-[200px]">— {stepData.user_agent.substring(0, 80)}…</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignatureWorkflow;
