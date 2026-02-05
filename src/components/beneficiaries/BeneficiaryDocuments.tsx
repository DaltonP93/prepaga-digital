
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface BeneficiaryDocumentsProps {
  beneficiaryId: string;
  beneficiaryName: string;
}

export const BeneficiaryDocuments: React.FC<BeneficiaryDocumentsProps> = ({
  beneficiaryId,
  beneficiaryName,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['beneficiary-documents', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_documents')
        .select('*, document_types(*)')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!beneficiaryId,
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true)
        .in('applies_to', ['adherente', 'ambos'])
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${beneficiaryId}/${Date.now()}-${file.name}`;
      
      // Upload to storage (you would configure this bucket)
      const { error: uploadError } = await supabase.storage
        .from('beneficiary-documents')
        .upload(fileName, file);

      if (uploadError) {
        // If bucket doesn't exist, just save the file reference
        console.log('Storage upload not configured, saving reference only');
      }

      // Save document record
      const { data, error } = await supabase
        .from('beneficiary_documents')
        .insert({
          beneficiary_id: beneficiaryId,
          file_name: file.name,
          file_url: fileName,
          file_type: file.type,
          file_size: file.size,
          upload_source: 'vendedor',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-documents', beneficiaryId] });
      toast({
        title: 'Documento subido',
        description: 'El documento ha sido subido exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir el documento.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('beneficiary_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-documents', beneficiaryId] });
      toast({
        title: 'Documento eliminado',
        description: 'El documento ha sido eliminado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el documento.',
        variant: 'destructive',
      });
    },
  });

  const verifyDocument = useMutation({
    mutationFn: async ({ docId, verified }: { docId: string; verified: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('beneficiary_documents')
        .update({
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id : null,
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-documents', beneficiaryId] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado de verificación ha sido actualizado.',
      });
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        uploadDocument.mutate(file);
      });
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documentos de {beneficiaryName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm">Suelte el archivo aquí...</p>
          ) : (
            <div>
              <p className="text-sm font-medium">Arrastra documentos o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG hasta 10MB</p>
            </div>
          )}
        </div>

        {/* Documents List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Cargando documentos...
          </p>
        ) : documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.is_verified ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyDocument.mutate({ docId: doc.id, verified: true })}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verificar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('¿Eliminar este documento?')) {
                        deleteDocument.mutate(doc.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay documentos adjuntos
          </p>
        )}

        {/* Required Documents Checklist */}
        {documentTypes.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium mb-2">Documentos Requeridos</p>
            <div className="space-y-1">
              {documentTypes.filter((dt: any) => dt.is_required).map((docType: any) => {
                const hasDocument = documents.some(
                  (d: any) => d.document_type_id === docType.id
                );
                return (
                  <div
                    key={docType.id}
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                      hasDocument ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {hasDocument ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>{docType.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
