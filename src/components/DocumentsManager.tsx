
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';

interface DocumentsManagerProps {
  saleId: string;
}

export const DocumentsManager: React.FC<DocumentsManagerProps> = ({ saleId }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['sale-detail-documents', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, document_type, created_at, file_url')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (document: {
      sale_id: string;
      name: string;
      document_type: string;
      content: string;
      file_url: string;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .insert(document as any)
        .select('id, name, document_type, created_at, file_url')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-detail-documents', saleId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Documento creado',
        description: 'El documento se ha creado exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear el documento.',
        variant: 'destructive',
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-detail-documents', saleId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Documento eliminado',
        description: 'El documento se ha eliminado exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento.',
        variant: 'destructive',
      });
    },
  });

  const isCreating = createDocumentMutation.isPending;
  const isDeleting = deleteDocumentMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !file) return;

    createDocumentMutation.mutate({
      sale_id: saleId,
      name,
      document_type: file.type,
      content: '',
      file_url: '',
    });

    setName('');
    setFile(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este documento?')) {
      deleteDocumentMutation.mutate(id);
    }
  };

  const handleDownload = async (document: { file_url: string | null; name: string }) => {
    if (!document.file_url) {
      toast({
        title: 'Documento sin archivo',
        description: 'Este documento no tiene un archivo descargable asociado.',
        variant: 'destructive',
      });
      return;
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_url, 3600);

    if (error || !data?.signedUrl) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el enlace de descarga.',
        variant: 'destructive',
      });
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return <div>Cargando documentos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>
              Gestiona los documentos de esta venta
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Documento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border p-4 rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-4">Nuevo Documento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Documento</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del documento"
                  required
                />
              </div>
              <div>
                <Label htmlFor="file">Archivo</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  Subir Documento
                </Button>
              </div>
            </form>
          </div>
        )}

        {documents && documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>{document.name}</TableCell>
                  <TableCell>{document.document_type}</TableCell>
                  <TableCell>
                    {new Date(document.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setPreviewDocument(document)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(document)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No hay documentos subidos
          </p>
        )}
      </CardContent>
      <DocumentPreviewDialog
        open={!!previewDocument}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        document={previewDocument}
      />
    </Card>
  );
};
