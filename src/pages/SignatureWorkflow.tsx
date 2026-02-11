
import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Users, Send, Copy, ExternalLink, Check, MessageCircle, Download } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useSignatureLinks } from '@/hooks/useSignatureLinks';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  
  // Fetch signed documents for this sale
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

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedSale = saleId ? sales.find(s => s.id === saleId) : null;

  const getSignatureUrl = (linkToken: string) => {
    return `${window.location.origin}/firmar/${linkToken}`;
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
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${message}`
      : `https://web.whatsapp.com/send?text=${message}`;
    window.open(waUrl, '_blank');
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

  if (token) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Acceso público al flujo de firmas</p>
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

  const titularLinks = signatureLinks?.filter((l: any) => l.recipient_type === 'titular') || [];
  const adherenteLinks = signatureLinks?.filter((l: any) => l.recipient_type === 'adherente') || [];

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
          const isExpired = new Date(link.expires_at) < new Date();
          const phone = getRecipientPhone(link);
          const name = getRecipientName(link);

          return (
            <div key={link.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{getRecipientLabel(link)}</p>
                  <p className="text-xs text-muted-foreground">
                    Creado: {new Date(link.created_at).toLocaleDateString('es-PY')} • 
                    Expira: {new Date(link.expires_at).toLocaleDateString('es-PY')}
                    {link.access_count > 0 && ` • Visto ${link.access_count} vez(es)`}
                  </p>
                </div>
                <Badge variant={
                  isCompleted ? 'default' :
                  isExpired ? 'destructive' :
                  link.status === 'visualizado' ? 'secondary' :
                  'outline'
                }>
                  {isCompleted ? '✓ Firmado' : isExpired ? 'Expirado' : link.status}
                </Badge>
              </div>

              {!isCompleted && !isExpired && (
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
                    variant="outline"
                    onClick={() => window.open(getSignatureUrl(link.token), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleSendWhatsApp(phone, link.token, name)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Enviar por WhatsApp
                  </Button>
                </div>
              )}

              {isCompleted && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Descargar Documento Firmado
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
              Información de la Venta
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
                Cada adherente recibe únicamente su DDJJ de Salud para firmar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSignatureLinks(adherenteLinks)}
            </CardContent>
          </Card>
        )}

        {/* Signed Documents - for vendor to download */}
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
                        {doc.file_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3 mr-1" />
                              Descargar
                            </a>
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
    </div>
  );
};

export default SignatureWorkflow;
