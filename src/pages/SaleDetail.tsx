import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSale } from '@/hooks/useSale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SaleDetails } from '@/components/SaleDetails';
import { ClientDetails } from '@/components/ClientDetails';
import { DocumentsManager } from '@/components/DocumentsManager';
import { RequirementsManager } from '@/components/RequirementsManager';
import { NotesManager } from '@/components/NotesManager';
import { BeneficiariesManager } from '@/components/BeneficiariesManager';

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: sale, isLoading } = useSale(id!);
  const [activeTab, setActiveTab] = useState('details');

  if (isLoading) {
    return <div>Cargando detalles de la venta...</div>;
  }

  if (!sale) {
    return <div>Venta no encontrada.</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detalle de Venta</h1>
          <p className="text-muted-foreground">
            Información completa de la venta #{id?.slice(0, 8)}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="client">Cliente</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiarios</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="requirements">Requisitos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <SaleDetails sale={sale} />
        </TabsContent>

        <TabsContent value="client">
          <ClientDetails clientId={sale.client_id!} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsManager saleId={id!} />
        </TabsContent>

        <TabsContent value="requirements">
          <RequirementsManager saleId={id!} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesManager saleId={id!} />
        </TabsContent>

        <TabsContent value="beneficiaries">
          <BeneficiariesManager saleId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
