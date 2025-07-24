
import React from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Share, Send, FileText, MessageSquare, CheckSquare, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BeneficiariesManager } from '@/components/BeneficiariesManager';
import { SaleDocuments } from '@/components/SaleDocuments';
import { SaleNotes } from '@/components/SaleNotes';
import { SaleRequirements } from '@/components/SaleRequirements';
import { DocumentTrackingPanel } from '@/components/DocumentTrackingPanel';
import { useState } from 'react';
import { useGenerateQuestionnaireLink, useGenerateSignatureLink } from '@/hooks/useSales';

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: sales, isLoading } = useSales();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const generateQuestionnaireLink = useGenerateQuestionnaireLink();
  const generateSignatureLink = useGenerateSignatureLink();

  const sale = sales?.find(s => s.id === id);

  const getStatusBadge = (status: string) => {
    const badges = {
      borrador: { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
      enviado: { label: 'Enviado', className: 'bg-blue-100 text-blue-800' },
      firmado: { label: 'Firmado', className: 'bg-green-100 text-green-800' },
      completado: { label: 'Completado', className: 'bg-purple-100 text-purple-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status as keyof typeof badges] || badges.borrador;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const openModal = (modalType: string) => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleGenerateQuestionnaireLink = async () => {
    if (sale?.id) {
      try {
        await generateQuestionnaireLink.mutateAsync(sale.id);
      } catch (error) {
        console.error('Error generating questionnaire link:', error);
      }
    }
  };

  const handleGenerateSignatureLink = async () => {
    if (sale?.id) {
      try {
        await generateSignatureLink.mutateAsync(sale.id);
      } catch (error) {
        console.error('Error generating signature link:', error);
      }
    }
  };

  const shareViaWhatsApp = () => {
    if (sale?.signature_token) {
      const url = `${window.location.origin}/signature/${sale.signature_token}`;
      const message = `Hola ${sale.clients?.first_name}, por favor firma tu contrato en el siguiente enlace: ${url}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Layout title="Cargando..." description="">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Cargando venta...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sale) {
    return (
      <Layout title="Venta no encontrada" description="">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Venta no encontrada</h2>
          <p className="text-muted-foreground mb-6">La venta que buscas no existe o no tienes permisos para verla.</p>
          <Link to="/sales">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Ventas
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Detalle de Venta" description="">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/sales">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detalle de Venta</h1>
            <p className="text-muted-foreground">
              Información completa de la venta
            </p>
          </div>
        </div>

        {/* Información principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{sale.clients?.first_name} {sale.clients?.last_name}</span>
              {getStatusBadge(sale.status || 'borrador')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nº Solicitud</p>
                <p className="font-medium">{sale.request_number || 'Generando...'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nº Contrato</p>
                <p className="font-medium">{sale.contract_number || 'Generando...'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">{sale.plans?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="font-medium">${Number(sale.total_amount || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{sale.clients?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{sale.clients?.phone}</p>
              </div>
            </div>

            {sale.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{sale.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => openModal('beneficiaries')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Beneficiarios
          </Button>
          <Button
            variant="outline"
            onClick={() => openModal('documents')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Digitalizaciones
          </Button>
          <Button
            variant="outline"
            onClick={() => openModal('notes')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Novedades
          </Button>
          <Button
            variant="outline"
            onClick={() => openModal('requirements')}
            className="flex items-center gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Requisitos
          </Button>
        </div>

        {/* Tracking y enlaces de firma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estado del Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentTrackingPanel saleId={sale.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones de Firma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sale.template_id && (
                <Button
                  onClick={handleGenerateQuestionnaireLink}
                  disabled={generateQuestionnaireLink.isPending}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {generateQuestionnaireLink.isPending ? 'Generando...' : 'Enviar Cuestionario'}
                </Button>
              )}
              
              <Button
                onClick={handleGenerateSignatureLink}
                disabled={generateSignatureLink.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {generateSignatureLink.isPending ? 'Generando...' : 'Enviar Firma'}
              </Button>

              {sale.signature_token && (
                <Button
                  onClick={shareViaWhatsApp}
                  variant="outline"
                  className="w-full"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Compartir por WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modales */}
        {sale && (
          <>
            <BeneficiariesManager
              saleId={sale.id}
              open={activeModal === 'beneficiaries'}
              onOpenChange={closeModal}
            />
            <SaleDocuments
              saleId={sale.id}
              open={activeModal === 'documents'}
              onOpenChange={closeModal}
            />
            <SaleNotes
              saleId={sale.id}
              open={activeModal === 'notes'}
              onOpenChange={closeModal}
            />
            <SaleRequirements
              saleId={sale.id}
              open={activeModal === 'requirements'}
              onOpenChange={closeModal}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
