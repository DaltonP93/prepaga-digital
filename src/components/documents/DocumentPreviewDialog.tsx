import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, User, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    name: string;
    content: string | null;
    file_url?: string | null;
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

const FilePreview: React.FC<{ fileUrl: string; fileName: string }> = ({ fileUrl, fileName }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      setLoading(true);
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, 3600);
      setSignedUrl(data?.signedUrl || null);
      setLoading(false);
    };
    fetchUrl();
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No se pudo cargar el archivo.</p>
      </div>
    );
  }

  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);

  return (
    <div className="space-y-3">
      {isPdf && (
        <iframe
          src={signedUrl}
          title={fileName}
          className="w-full border rounded"
          style={{ height: '60vh' }}
        />
      )}
      {isImage && (
        <img
          src={signedUrl}
          alt={fileName}
          className="max-w-full rounded border mx-auto"
        />
      )}
      <div className="text-center">
        <Button variant="outline" size="sm" asChild>
          <a href={signedUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-3 w-3 mr-1" />
            Descargar archivo
          </a>
        </Button>
      </div>
    </div>
  );
};

export const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  open,
  onOpenChange,
  document,
}) => {
  if (!document) return null;

  const hasContent = !!document.content?.trim();
  const hasFileUrl = !!document.file_url;

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
          {hasContent ? (
            <div
              className="prose prose-sm max-w-none p-4 bg-white rounded border"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(document.content || '') }}
            />
          ) : hasFileUrl ? (
            <div className="p-4">
              <FilePreview fileUrl={document.file_url!} fileName={document.name} />
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>Sin contenido disponible para previsualizar.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
