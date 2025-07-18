
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface SaleDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  observations?: string;
  created_at: string;
  uploaded_by: string;
}

interface SaleDocumentsProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaleDocuments: React.FC<SaleDocumentsProps> = ({
  saleId,
  open,
  onOpenChange,
}) => {
  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    document_type: '',
    observations: '',
  });

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

      // Subir archivo a storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `sale-documents/${saleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insertar registro en base de datos
      const { data, error } = await supabase
        .from('sale_documents')
        .insert({
          sale_id: saleId,
          document_name: metadata.document_name || file.name,
          document_type: metadata.document_type,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          observations: metadata.observations,
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
      setUploadForm({
        document_name: '',
        document_type: '',
        observations: '',
      });
    },
    onError: (error) => {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('sale_documents')
        .delete()
        .eq('id', documentId);

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
      if (!uploadForm.document_name) {
        setUploadForm(prev => ({ ...prev, document_name: file.name }));
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
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const documentTypes = [
    { value: 'identificacion', label: 'Identificación' },
    { value: 'comprobante_ingresos', label: 'Comprobante de Ingresos' },
    { value: 'declaracion_jurada', label: 'Declaración Jurada' },
    { value: 'constancia_trabajo', label: 'Constancia de Trabajo' },
    { value: 'recibo_sueldo', label: 'Recibo de Sueldo' },
    { value: 'certificado_medico', label: 'Certificado Médico' },
    { value: 'otro', label: 'Otro' },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Digitalizaciones y Documentos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Área de carga de documentos */}
          <Card>
            <CardHeader>
              <CardTitle>Subir Nuevo Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="document_name">Nombre del Documento</Label>
                  <Input
                    id="document_name"
                    value={uploadForm.document_name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))}
                    placeholder="Nombre descriptivo del documento"
                  />
                </div>
                <div>
                  <Label htmlFor="document_type">Tipo de Documento</Label>
                  <Select
                    value={uploadForm.document_type}
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, document_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Dropzone */}
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
                    <p className="text-sm text-muted-foreground mt-2">
                      o haz clic para seleccionar un archivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos soportados: PDF, DOC, DOCX, IMG (Máx. 10MB)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de documentos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documentos Subidos</h3>
            {isLoading ? (
              <div className="text-center py-8">Cargando documentos...</div>
            ) : documents && documents.length > 0 ? (
              <div className="grid gap-4">
                {documents.map((document) => (
                  <Card key={document.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <h4 className="font-medium">{document.document_name}</h4>
                            <Badge variant="outline">
                              {documentTypes.find(t => t.value === document.document_type)?.label || document.document_type}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            {document.file_size && (
                              <p>Tamaño: {formatFileSize(document.file_size)}</p>
                            )}
                            <p>Subido: {new Date(document.created_at).toLocaleString()}</p>
                            {document.observations && (
                              <p>Observaciones: {document.observations}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(document.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = document.file_url;
                              link.download = document.document_name;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument.mutate(document.id)}
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
              <div className="text-center py-8 text-muted-foreground">
                No hay documentos subidos
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
