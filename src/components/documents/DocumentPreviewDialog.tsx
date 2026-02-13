import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield, User } from 'lucide-react';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    name: string;
    content: string | null;
    document_type: string;
    status: string;
    beneficiary_id?: string | null;
  } | null;
}

const getTypeBadge = (type: string) => {
  if (type === 'ddjj_salud' || type?.toLowerCase().includes('ddjj')) {
    return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">DDJJ Salud</Badge>;
  }
  if (type?.toLowerCase().includes('contrato')) {
    return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Contrato</Badge>;
  }
  return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">Anexo</Badge>;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'firmado':
      return <Badge className="bg-green-600">Firmado</Badge>;
    case 'pendiente':
      return <Badge variant="secondary">Pendiente</Badge>;
    case 'rechazado':
      return <Badge variant="destructive">Rechazado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  open,
  onOpenChange,
  document,
}) => {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5" />
            {document.name}
            {getTypeBadge(document.document_type)}
            {getStatusBadge(document.status)}
            {document.beneficiary_id && (
              <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                <User className="h-3 w-3 mr-1" />
                Adherente
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[70vh]">
          <div
            className="prose prose-sm max-w-none p-4 bg-white rounded border"
            dangerouslySetInnerHTML={{ __html: document.content || '<p>Sin contenido</p>' }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
