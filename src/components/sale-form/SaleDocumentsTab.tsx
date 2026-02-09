
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SaleDocumentsTabProps {
  saleId?: string;
}

const SaleDocumentsTab: React.FC<SaleDocumentsTabProps> = ({ saleId }) => {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['sale-documents', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  if (!saleId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guarde la venta primero</h3>
        <p className="text-muted-foreground">
          Debe guardar la venta antes de gestionar documentos.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando documentos...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'firmado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Documentos ({documents?.length || 0})</h3>
      </div>

      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status || '')}
                  <div>
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {doc.document_type || 'Sin tipo'} • v{doc.version}
                    </div>
                  </div>
                </div>
                <Badge variant={doc.status === 'firmado' ? 'default' : 'outline'}>
                  {doc.status || 'pendiente'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No hay documentos asociados a esta venta. Los documentos se generarán automáticamente cuando la venta sea aprobada.
        </div>
      )}
    </div>
  );
};

export default SaleDocumentsTab;
