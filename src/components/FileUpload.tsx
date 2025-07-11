
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploadProps {
  bucket: string;
  path?: string;
  accept?: string;
  maxSize?: number; // in MB
  onUploadComplete?: (url: string) => void;
  disabled?: boolean;
}

export const FileUpload = ({
  bucket,
  path,
  accept = "*/*",
  maxSize = 50,
  onUploadComplete,
  disabled = false,
}: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploadState } = useFileUpload();

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`El archivo es demasiado grande. Máximo ${maxSize}MB permitidos.`);
      return;
    }

    const url = await uploadFile(file, bucket, path);
    if (url && onUploadComplete) {
      onUploadComplete(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || uploadState.isUploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const openFileDialog = () => {
    if (disabled || uploadState.isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <Card className={`transition-colors ${dragActive ? 'border-primary' : ''}`}>
      <CardContent className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled || uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={disabled || uploadState.isUploading}
          />

          {uploadState.isUploading ? (
            <div className="space-y-4">
              <File className="mx-auto h-12 w-12 text-primary" />
              <div>
                <p className="text-sm font-medium">Subiendo archivo...</p>
                <Progress value={uploadState.progress} className="mt-2" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  Arrastra un archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Máximo {maxSize}MB
                </p>
              </div>
            </div>
          )}

          {uploadState.error && (
            <p className="text-sm text-destructive mt-2">{uploadState.error}</p>
          )}
        </div>

        {!uploadState.isUploading && !disabled && (
          <Button className="w-full mt-4" onClick={openFileDialog}>
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar Archivo
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
