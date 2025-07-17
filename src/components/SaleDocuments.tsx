import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Eye, Download, Trash2, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SaleDocument {
  id: string;
  sale_id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  observations?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

interface SaleDocumentsProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOCUMENT_TYPES = [
  { value: 'ci', label: 'Cédula de Identidad' },
  { value: 'birth_certificate', label: 'Acta de Nacimiento' },
  { value: 'income_proof', label: 'Comprobante de Ingresos' },
  { value: 'bank_statement', label: 'Estado de Cuenta' },
  { value: 'work_certificate', label: 'Certificado Laboral' },
  { value: 'medical_report', label: 'Informe Médico' },
  { value: 'insurance_policy', label: 'Póliza de Seguro' },
  { value: 'other', label: 'Otro' },
];

export function SaleDocuments({ saleId, open, onOpenChange }: SaleDocumentsProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [observations, setObservations] = useState('');
  const [viewingDocument, setViewingDocument] = useState<SaleDocument | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
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
    enabled: !!saleId,
  });

  // Upload document mutation
  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !documentType || !documentName) {
        throw new Error('Faltan datos requeridos');
      }

      setUploading(true);

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `sale-documents/${saleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Save document record
      const { error: dbError } = await supabase
        .from('sale_documents')
        .insert({
          sale_id: saleId,
          document_name: documentName,
          document_type: documentType,
          file_url: publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          observations: observations || null,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id!,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', saleId] });
      toast({
        title: "Documento subido",
        description: "El documento ha sido subido exitosamente.",
      });
      // Reset form
      setSelectedFile(null);
      setDocumentType('');
      setDocumentName('');
      setObservations('');
      setUploading(false);
    },
    onError: (error) => {
      setUploading(false);
      toast({
        title: "Error",
        description: "No se pudo subir el documento.",
        variant: "destructive",
      });
      console.error('Error uploading document:', error);
    },
  });

  // Delete document mutation
  const deleteDocument = useMutation({
    mutationFn: async (document: SaleDocument) => {
      // Extract file path from URL
      const url = new URL(document.file_url);
      const filePath = url.pathname.split('/storage/v1/object/public/documents/')[1];
      
      // Delete from storage
      if (filePath) {
        await supabase.storage
          .from('documents')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('sale_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-documents', saleId] });
      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
      console.error('Error deleting document:', error);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name);
      }
    }
  };

  const handleUpload = () => {
    uploadDocument.mutate();
  };

  const handleDelete = (document: SaleDocument) => {
    if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      deleteDocument.mutate(document);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Digitalizaciones</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Form */}
            <Card>
              <CardHeader>
                <CardTitle>Subir Nuevo Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Archivo</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <p className="text-sm text-muted-foreground">
                      Formatos: PDF, DOC, DOCX, JPG, PNG (Max: 10MB)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document_name">Nombre del Documento</Label>
                  <Input
                    id="document_name"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Nombre descriptivo del documento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || !documentType || !documentName || uploading}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </Button>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Documentos Subidos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Cargando documentos...</div>
                ) : documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Tamaño</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Observaciones</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4" />
                              <span>{document.document_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getDocumentTypeLabel(document.document_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(document.file_size)}</TableCell>
                          <TableCell>
                            {new Date(document.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {document.observations || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingDocument(document)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(document.file_url, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(document)}
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
                  <div className="text-center py-8 text-muted-foreground">
                    No hay documentos subidos
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      {viewingDocument && (
        <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{viewingDocument.document_name}</DialogTitle>
            </DialogHeader>
            <div className="h-96 overflow-auto">
              {viewingDocument.mime_type?.startsWith('image/') ? (
                <img 
                  src={viewingDocument.file_url} 
                  alt={viewingDocument.document_name}
                  className="w-full h-auto"
                />
              ) : (
                <iframe 
                  src={viewingDocument.file_url} 
                  className="w-full h-full border-0"
                  title={viewingDocument.document_name}
                />
              )}
            </div>
            {viewingDocument.observations && (
              <div className="mt-4">
                <Label>Observaciones:</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewingDocument.observations}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}