import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, AlertCircle, Upload, Download, Eye, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface SaleDocumentsTabProps {
  saleId?: string;
}

const isImageType = (fileType: string | null): boolean => {
  return !!fileType && fileType.startsWith('image/');
};

const SaleDocumentsTab: React.FC<SaleDocumentsTabProps> = ({ saleId }) => {
  const [fileName, setFileName] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [lightboxName, setLightboxName] = useState('');
  const [lightboxType, setLightboxType] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['sale-documents-tab', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('sale_documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, customName }: { file: File; customName: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Get user's company_id for storage path (RLS requires company_id as first folder)
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      const companyId = profile?.company_id;
      if (!companyId) throw new Error('No se encontró la empresa del usuario');

      const fileExt = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${companyId}/sale-documents/${saleId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('sale_documents')
        .insert({
          sale_id: saleId!,
          file_name: customName || file.name,
          file_url: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents-tab', saleId] });
      toast.success('Documento subido correctamente');
      setFileName('');
    },
    onError: (e: any) => toast.error(e.message || 'Error al subir documento'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_url: string }) => {
      await supabase.storage.from('documents').remove([doc.file_url]);
      const { error } = await supabase.from('sale_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents-tab', saleId] });
      toast.success('Documento eliminado');
    },
    onError: (e: any) => toast.error(e.message || 'Error al eliminar'),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      uploadMutation.mutate({ file, customName: fileName || file.name });
    }
  }, [fileName, uploadMutation]);

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

  const getSignedUrl = async (fileUrl: string, expiresIn = 3600): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(fileUrl, expiresIn);
    if (error || !data) {
      toast.error('Error al generar enlace del archivo');
      return null;
    }
    return data.signedUrl;
  };

  const handleView = async (fileUrl: string, fileType: string | null, docName: string) => {
    const signedUrl = await getSignedUrl(fileUrl);
    if (!signedUrl) return;

    if (isImageType(fileType) || fileType === 'application/pdf' || /\.(pdf|doc|docx)$/i.test(docName)) {
      setLightboxUrl(signedUrl);
      setLightboxName(docName);
      setLightboxType(fileType || '');
      setLightboxOpen(true);
    } else {
      window.open(signedUrl, '_blank');
    }
  };

  const handleDownload = async (fileUrl: string, name: string) => {
    const signedUrl = await getSignedUrl(fileUrl, 300);
    if (!signedUrl) return;
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label htmlFor="doc-name">Nombre del Documento (opcional)</Label>
            <Input
              id="doc-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Nombre descriptivo del documento"
            />
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Suelta el archivo aquí...</p>
            ) : (
              <div>
                <p className="font-medium">Arrastra y suelta tu archivo aquí</p>
                <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX, IMG (Máx. 10MB)</p>
              </div>
            )}
            {uploadMutation.isPending && (
              <p className="text-sm text-primary mt-2">Subiendo...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Documentos Subidos ({documents?.length || 0})</h3>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando documentos...</div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{doc.file_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                        {doc.file_type && <Badge variant="outline" className="ml-2 text-xs">{doc.file_type.split('/').pop()}</Badge>}
                        {doc.created_at && <span className="ml-2">{new Date(doc.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleView(doc.file_url, doc.file_type, doc.file_name)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.file_url, doc.file_name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: doc.id, file_url: doc.file_url })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay documentos subidos aún. Suba digitalizaciones o archivos relacionados a la venta.
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={lightboxUrl}
        fileName={lightboxName}
        fileType={lightboxType}
      />
    </div>
  );
};

export default SaleDocumentsTab;
