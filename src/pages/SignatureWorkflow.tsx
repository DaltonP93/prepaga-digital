
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureWorkflowManager } from "@/components/SignatureWorkflowManager";
import { useSales } from "@/hooks/useSales";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search 
} from "lucide-react";

export default function SignatureWorkflow() {
  const { data: sales, isLoading } = useSales();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSales = sales?.filter((sale) => {
    const matchesSearch = 
      sale.clients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.clients?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusStats = () => {
    if (!sales) return { draft: 0, sent: 0, signed: 0, completed: 0 };
    
    return sales.reduce((acc, sale) => {
      switch (sale.status) {
        case "borrador":
          acc.draft++;
          break;
        case "enviado":
          acc.sent++;
          break;
        case "firmado":
          acc.signed++;
          break;
        case "completado":
          acc.completed++;
          break;
      }
      return acc;
    }, { draft: 0, sent: 0, signed: 0, completed: 0 });
  };

  const stats = getStatusStats();

  if (isLoading) {
    return (
      <Layout title="Flujo de Firmas" description="Gestiona el proceso de firmas digitales de contratos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flujo de Firmas" description="Gestiona el proceso de firmas digitales de contratos">
      <div className="space-y-6">
        {/* Dashboard de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-sm text-muted-foreground">Borradores</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Send className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-sm text-muted-foreground">Enviados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.signed}</p>
                <p className="text-sm text-muted-foreground">Firmados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="borrador">Borradores</TabsTrigger>
            <TabsTrigger value="enviado">Enviados</TabsTrigger>
            <TabsTrigger value="firmado">Firmados</TabsTrigger>
            <TabsTrigger value="completado">Completados</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="space-y-4">
            {/* Búsqueda */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, email o número de contrato..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista de ventas */}
            <div className="space-y-4">
              {filteredSales?.map((sale) => (
                <Card key={sale.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {sale.clients?.first_name} {sale.clients?.last_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {sale.clients?.email} • Contrato: {sale.contract_number || "Sin asignar"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sale.status === "borrador" && (
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 mr-1" />
                            Borrador
                          </Badge>
                        )}
                        {sale.status === "enviado" && (
                          <Badge variant="outline">
                            <Send className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                        {sale.status === "firmado" && (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Firmado
                          </Badge>
                        )}
                        {sale.status === "completado" && (
                          <Badge className="bg-blue-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Completado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p><strong>Plan:</strong> {sale.plans?.name}</p>
                        <p><strong>Monto:</strong> ${sale.total_amount || sale.plans?.price}</p>
                        <p><strong>Fecha:</strong> {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "No especificada"}</p>
                      </div>
                      <SignatureWorkflowManager
                        saleId={sale.id}
                        currentStatus={sale.status}
                        signatureToken={sale.signature_token}
                        signatureExpiresAt={sale.signature_expires_at}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSales?.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No se encontraron ventas que coincidan con los filtros aplicados.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
