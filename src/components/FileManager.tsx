import { useState, useRef } from 'react';
import { Upload, File, Trash2, Download, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFileManager } from '@/hooks/useFileManager';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface FileManagerProps {
  bucketName?: string;
  allowMultiple?: boolean;
  showUploadArea?: boolean;
  onFileSelect?: (file: any) => void;
}

const FileManager = ({ 
  bucketName = 'documents', 
  allowMultiple = true,
  showUploadArea = true,
  onFileSelect
}: FileManagerProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    files,
    uploadProgress,
    isLoadingFiles,
    uploadFile,
    deleteFile,
    getSignedUrl,
    isUploading,
    isDeleting,
    validateFile,
    formatFileSize
  } = useFileManager();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    uploadFiles(selectedFiles);
  };

  const uploadFiles = (filesToUpload: File[]) => {
    filesToUpload.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      
      uploadFile({ file, options: { bucketName } });
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    uploadFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDownload = async (file: any) => {
    try {
      await getSignedUrl({
        filePath: file.file_path,
        bucketName: file.bucket_name
      });
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
    return '📁';
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-green-100 text-green-800';
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800';
    if (mimeType.includes('word')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('excel') || mimeType.includes('csv')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="h-5 w-5" />
          Gestor de Archivos
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {showUploadArea && (
          <>
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Arrastra archivos aquí</p>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar archivos
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Seleccionar Archivos
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple={allowMultiple}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              />
              
              <p className="text-xs text-muted-foreground mt-2">
                Máximo 10MB • Imágenes, PDF, Word, CSV
              </p>
            </div>

            {/* Upload Progress */}
            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subiendo archivo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </>
        )}

        {/* Files List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Archivos ({files.length})</h3>
          </div>
          
          {isLoadingFiles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay archivos subidos</p>
              <p className="text-sm">Sube archivos para verlos aquí</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" title={file.file_name}>
                            {file.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteFile(file.id)}
                        disabled={isDeleting}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Badge variant="secondary" className={`text-xs ${getFileTypeColor(file.mime_type)}`}>
                        {file.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Badge>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(file.created_at), {
                          addSuffix: true,
                          locale: es
                        })}
                      </p>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="h-7 px-2 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Descargar
                        </Button>
                        
                        {onFileSelect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFileSelect(file)}
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Seleccionar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileManager;