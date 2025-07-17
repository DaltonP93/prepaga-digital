
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Users,
  Upload,
  ClipboardList,
  FileCheck,
  Pencil,
  FileText,
  Link
} from "lucide-react";
import { useSales, useGenerateSignatureLink, useGenerateQuestionnaireLink } from "@/hooks/useSales";
import { useToast } from "@/hooks/use-toast";
import { BeneficiariesManager } from "@/components/BeneficiariesManager";
import { SaleDocuments } from "@/components/SaleDocuments";
import { SaleNotes } from "@/components/SaleNotes";
import { SaleRequirements } from "@/components/SaleRequirements";

interface SaleActionsProps {
  sale: any;
  onEdit: (sale: any) => void;
  onDownloadContract: (sale: any) => void;
}

export function SaleActions({ sale, onEdit, onDownloadContract }: SaleActionsProps) {
  const { toast } = useToast();
  const generateSignatureLink = useGenerateSignatureLink();
  const generateQuestionnaireLink = useGenerateQuestionnaireLink();
  
  const [showBeneficiaries, setShowBeneficiaries] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const handleGenerateQuestionnaireLink = async () => {
    try {
      const result = await generateQuestionnaireLink.mutateAsync(sale.id);
      
      if (result.questionnaireUrl) {
        const cleanUrl = result.questionnaireUrl.replace(/=+$/, '');
        await navigator.clipboard.writeText(cleanUrl);
        
        toast({
          title: "Enlace del cuestionario generado",
          description: "El enlace ha sido copiado al portapapeles.",
        });
      }
    } catch (error) {
      console.error('Error generating questionnaire link:', error);
    }
  };

  const handleGenerateSignatureLink = async () => {
    try {
      const result = await generateSignatureLink.mutateAsync(sale.id);
      await navigator.clipboard.writeText(result.signatureUrl);
      
      toast({
        title: "Enlace generado",
        description: "El enlace de firma ha sido copiado al portapapeles.",
      });
    } catch (error) {
      console.error('Error generating signature link:', error);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {/* Primera fila de botones principales */}
        <div className="flex space-x-1 mb-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(sale)}
            title="Editar venta"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBeneficiaries(true)}
            title="Gestionar beneficiarios"
          >
            <Users className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocuments(true)}
            title="Digitalizaciones"
          >
            <Upload className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(true)}
            title="Novedades"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Segunda fila de botones */}
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRequirements(true)}
            title="Requisitos"
          >
            <ClipboardList className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadContract(sale)}
            title="Imprimir DJ / Contrato"
          >
            <FileCheck className="h-4 w-4" />
          </Button>

          {sale.status === 'borrador' && sale.template_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateQuestionnaireLink}
              disabled={generateQuestionnaireLink.isPending}
              title="Completar DJ"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          
          {sale.status === 'borrador' && !sale.template_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSignatureLink}
              disabled={generateSignatureLink.isPending}
              title="Generar enlace de firma"
            >
              <Link className="h-4 w-4" />
            </Button>
          )}
          
          {sale.signature_token && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(
                sale.template_id 
                  ? `/questionnaire/${sale.signature_token}`
                  : `/signature/${sale.signature_token}`, 
                '_blank'
              )}
              title="Ver documento"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Modales */}
      <BeneficiariesManager
        saleId={sale.id}
        open={showBeneficiaries}
        onOpenChange={setShowBeneficiaries}
      />

      <SaleDocuments
        saleId={sale.id}
        open={showDocuments}
        onOpenChange={setShowDocuments}
      />

      <SaleNotes
        saleId={sale.id}
        open={showNotes}
        onOpenChange={setShowNotes}
      />

      <SaleRequirements
        saleId={sale.id}
        open={showRequirements}
        onOpenChange={setShowRequirements}
      />
    </>
  );
}
