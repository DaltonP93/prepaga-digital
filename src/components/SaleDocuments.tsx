
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface SaleDocument {
  id: string;
  file_name: string;
  file_type: string | null;
  file_url: string;
  file_size: number | null;
  created_at: string | null;
  uploaded_by: string | null;
  sale_id: string;
}

interface SaleDocumentsProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isImageType = (fileType: string | null): boolean => {
  return !!fileType && fileType.startsWith('image/');
};

export const SaleDocuments: React.FC<SaleDocumentsProps> = ({
  saleId,
  open,
  onOpenChange,
}) => {
  const [uploadForm, setUploadForm] = useState({ file_name: '', observations: '' });
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [lightboxName, setLightboxName] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['sale-documents', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SaleDocument[];
    },
    enabled: open && !!saleId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: typeof uploadForm }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `sale-documents/${saleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('sale_documents')
        .insert({
          sale_id: saleId,
          file_name: metadata.file_name || file.name,
          file_url: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', saleId] });
      toast.success('Documento subido correctamente');
      setUploadForm({ file_name: '', observations: '' });
    },
    onError: (error) => {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase.from('sale_documents').delete().eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', saleId] });
      toast.success('Documento eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar documento');
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (!uploadForm.file_name) {
        setUploadForm(prev => ({ ...prev, file_name: file.name }));
      }
      uploadDocument.mutate({ file, metadata: uploadForm });
    }
  }, [uploadForm, uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSignedUrl = async (fileUrl: string, expiresIn = 3600): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(fileUrl, expiresIn);
    if (error || !data) {
      toast.error('Error al generar enlace del archivo');
      return null;
    }
    return data.signedUrl;
  };

  const handleDownload = async (doc: SaleDocument) => {
    const signedUrl = await getSignedUrl(doc.file_url, 300);
    if (!signedUrl) return;
    const link = window.document.createElement('a');
    link.href = signedUrl;
    link.download = doc.file_name;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleView = async (doc: SaleDocument) => {
    const signedUrl = await getSignedUrl(doc.file_url);
    if (!signedUrl) return;

    if (isImageType(doc.file_type)) {
      setLightboxUrl(signedUrl);
      setLightboxName(doc.file_name);
      setLightboxOpen(true);
    } else {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Digitalizaciones y Documentos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subir Nuevo Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="file_name">Nombre del Documento</Label>
                    <Input
                      id="file_name"
                      value={uploadForm.file_name}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, file_name: e.target.value }))}
                      placeholder="Nombre descriptivo del documento"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={uploadForm.observations}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Observaciones adicionales (opcional)"
                  />
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-primary">Suelta el archivo aquí...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium">Arrastra y suelta tu archivo aquí</p>
                      <p className="text-sm text-muted-foreground mt-2">o haz clic para seleccionar un archivo</p>
                      <p className="text-xs text-muted-foreground mt-2">Formatos soportados: PDF, DOC, DOCX, IMG (Máx. 10MB)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documentos Subidos</h3>
              {isLoading ? (
                <div className="text-center py-8">Cargando documentos...</div>
              ) : documents && documents.length > 0 ? (
                <div className="grid gap-4">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <h4 className="font-medium">{doc.file_name}</h4>
                              {doc.file_type && (
                                <Badge variant="outline">{doc.file_type}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {doc.file_size && <p>Tamaño: {formatFileSize(doc.file_size)}</p>}
                              {doc.created_at && <p>Subido: {new Date(doc.created_at).toLocaleString()}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleView(doc)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDocument.mutate(doc.id)}
                              disabled={deleteDocument.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No hay documentos subidos</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={lightboxUrl}
        fileName={lightboxName}
      />
    </>
  );
};
