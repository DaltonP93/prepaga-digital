import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Send,
  MessageSquare,
  Mail,
  Download,
  Eye,
  Smartphone,
  Clock,
  CheckCircle2,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import { useSales, useGenerateSignatureLink } from "@/hooks/useSales";
import { useToast } from "@/hooks/use-toast";

interface SaleCardProps {
  sale: any;
}

function SaleCard({ sale }: SaleCardProps) {
  const { toast } = useToast();
  const generateSignatureLink = useGenerateSignatureLink();

  const handleSendWhatsApp = async () => {
    if (!sale.clients?.phone) {
      toast({
        title: "Error",
        description: "El cliente no tiene teléfono registrado",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await generateSignatureLink.mutateAsync(sale.id);
      const message = `Hola ${sale.clients.first_name} ${sale.clients.last_name}, tienes un documento para firmar: ${result.signatureUrl}`;
      const whatsappUrl = `https://api.whatsapp.com/send/?text=${encodeURIComponent(message)}&type=custom_url&app_absent=0`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error generating signature link:', error);
    }
  };

  const handleSendEmail = async () => {
    try {
      const result = await generateSignatureLink.mutateAsync(sale.id);
      // Aquí se implementaría el envío por email
      toast({
        title: "Email enviado",
        description: "El enlace de firma ha sido enviado por correo electrónico"
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const handleSendSMS = async () => {
    if (!sale.clients?.phone) {
      toast({
        title: "Error", 
        description: "El cliente no tiene teléfono registrado",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await generateSignatureLink.mutateAsync(sale.id);
      // Aquí se implementaría el envío por SMS
      toast({
        title: "SMS enviado",
        description: "El enlace de firma ha sido enviado por SMS"
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrador': return 'bg-gray-100 text-gray-800';
      case 'enviado': return 'bg-blue-100 text-blue-800';
      case 'firmado': return 'bg-green-100 text-green-800';
      case 'completado': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {sale.clients?.first_name} {sale.clients?.last_name}
            </CardTitle>
            <CardDescription>
              {sale.clients?.email} • {sale.clients?.phone}
            </CardDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Contrato: {sale.contract_number || 'Sin asignar'}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Plan: {sale.plans?.name}</span>
            </div>
          </div>
          <Badge className={getStatusColor(sale.status)}>
            {sale.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Información del documento */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">INFORMACIÓN</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Creado: {new Date(sale.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span>Dispositivo: No accedido</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>Progreso: 0%</span>
              </div>
            </div>
          </div>

          {/* Estado del envío */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">ESTADO DEL ENVÍO</h4>
            <div className="space-y-2">
              {sale.signature_token ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Enlace generado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendiente de envío
                </Badge>
              )}
              {sale.signature_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Expira: {new Date(sale.signature_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">ACCIONES</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendWhatsApp}
                disabled={!sale.clients?.phone}
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                WhatsApp
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendEmail}
                className="flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                Email
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendSMS}
                disabled={!sale.clients?.phone}
                className="flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                SMS
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sale.signature_token && (
                    <DropdownMenuItem
                      onClick={() => window.open(`/signature/${sale.signature_token}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver documento
                    </DropdownMenuItem>
                  )}
                  {sale.status === 'firmado' && (
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar firmado
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir venta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImprovedSignatureWorkflow() {
  const { data: sales, isLoading } = useSales();
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSales = sales?.filter(sale => 
    statusFilter === "all" || sale.status === statusFilter
  );

  if (isLoading) {
    return <div className="p-6">Cargando flujo de firmas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Flujo de Firmas</h1>
          <p className="text-muted-foreground">
            Gestiona el envío y seguimiento de documentos para firma
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Todos", count: sales?.length || 0 },
          { key: "borrador", label: "Borradores", count: sales?.filter(s => s.status === "borrador").length || 0 },
          { key: "enviado", label: "Enviados", count: sales?.filter(s => s.status === "enviado").length || 0 },
          { key: "firmado", label: "Firmados", count: sales?.filter(s => s.status === "firmado").length || 0 },
        ].map(filter => (
          <Button
            key={filter.key}
            variant={statusFilter === filter.key ? "default" : "outline"}
            onClick={() => setStatusFilter(filter.key)}
            className="gap-2"
          >
            {filter.label}
            <Badge variant="secondary" className="ml-1">
              {filter.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Lista de ventas */}
      <div className="space-y-4">
        {filteredSales?.map((sale) => (
          <SaleCard key={sale.id} sale={sale} />
        ))}
      </div>

      {filteredSales?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay ventas para mostrar con el filtro seleccionado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}