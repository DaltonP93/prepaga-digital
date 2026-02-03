
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Users, Send } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const SignatureWorkflow = () => {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  // Use only SimpleAuthContext since that's what's available in the app
  const { profile } = useSimpleAuthContext();
  
  const { data: sales = [], isLoading } = useSales();
  const { settings, formatCurrency } = useCurrencySettings();
  
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    if (saleId && sales.length > 0) {
      const sale = sales.find(s => s.id === saleId);
      setSelectedSale(sale);
    }
  }, [saleId, sales]);

  // If accessed with token (public access), handle differently
  if (token) {
    // Public signature access logic would go here
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Acceso público al flujo de firmas (implementar lógica específica)
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Protected access - show sales list or specific sale
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  // If no specific sale selected, show sales list
  if (!saleId || !selectedSale) {
    const availableSales = sales.filter(sale => 
      ['enviado', 'firmado'].includes(sale.status) || 
      (profile?.role === 'vendedor' && sale.salesperson_id === profile.id) ||
      ['admin', 'super_admin', 'gestor'].includes(profile?.role || '')
    );

    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Flujo de Firmas</h1>
            <p className="text-muted-foreground">
              Gestiona el proceso de firma de documentos
            </p>
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
                <p className="text-muted-foreground mb-4">
                  No hay ventas disponibles para firma
                </p>
                <Button onClick={() => navigate('/sales')}>
                  Ir a Ventas
                </Button>
              </CardContent>
            </Card>
          ) : (
            availableSales.map((sale) => (
              <Card key={sale.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {sale.clients ? `${sale.clients.first_name} ${sale.clients.last_name}` : 'Sin cliente'}
                      </CardTitle>
                      <CardDescription>
                        Plan: {sale.plans?.name || 'Sin plan'} • {formatCurrency(sale.total_amount || 0)}
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
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      ID: {sale.id.substring(0, 8)}...
                    </div>
                    <Button onClick={() => navigate(`/signature-workflow/${sale.id}`)}>
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

  // Show specific sale signature workflow
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Flujo de Firma</h1>
          <p className="text-muted-foreground">
            {selectedSale.clients ? `${selectedSale.clients.first_name} ${selectedSale.clients.last_name}` : 'Sin cliente'}
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
                <Badge variant={
                  selectedSale.status === 'completado' ? 'default' :
                  selectedSale.status === 'firmado' ? 'secondary' :
                  selectedSale.status === 'enviado' ? 'outline' :
                  'destructive'
                }>
                  {selectedSale.status}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Vendedor:</p>
                <p className="text-muted-foreground">
                  {selectedSale.salesperson ? 
                    `${selectedSale.salesperson.first_name} ${selectedSale.salesperson.last_name}` : 
                    'No asignado'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add signature workflow components here */}
        <Card>
          <CardHeader>
            <CardTitle>Proceso de Firma</CardTitle>
            <CardDescription>
              Gestiona el flujo de firma para esta venta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Componentes del flujo de firma se implementarán aquí
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignatureWorkflow;
