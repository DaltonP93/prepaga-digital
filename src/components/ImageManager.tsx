
import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  ImageIcon, 
  Copy, 
  Eye
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ImageManagerProps {
  onImageSelect: (url: string) => void;
}

interface UploadedImage {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string | null;
}

export const ImageManager: React.FC<ImageManagerProps> = ({ onImageSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploadState } = useFileUpload();

  // Fetch uploaded images
  const { data: images, isLoading, refetch } = useQuery({
    queryKey: ['template-images'],
    queryFn: async () => {
      console.log('🔍 Fetching images from database...');
      
      const { data, error } = await supabase
        .from('file_uploads')
        .select('id, file_name, file_url, file_size, file_type, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching images:', error);
        throw error;
      }

      console.log('✅ Images fetched from database:', data?.length || 0, 'items');

      // Filter to only image files
      const imageFiles = (data || []).filter(img => 
        img.file_type?.startsWith('image/') || 
        img.file_name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
      );

      return imageFiles as UploadedImage[];
    }
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    console.log('📤 Starting file upload:', file.name, file.type);
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona solo archivos de imagen');
      return;
    }

    try {
      const url = await uploadFile(file, 'documents', 'template-images');
      console.log('✅ File uploaded successfully:', url);
      
      if (url) {
        // Refresh the images list
        await refetch();
        toast.success('Imagen subida exitosamente');
        
        // Automatically select the uploaded image
        onImageSelect(url);
      }
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      toast.error('Error al subir la imagen');
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Gestor de Imágenes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={uploadState.isUploading}
          />
          
          {uploadState.isUploading ? (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
              <Progress value={uploadState.progress} className="w-full" />
              <p className="text-xs text-muted-foreground">{uploadState.progress}%</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium">Arrastra una imagen aquí</p>
                <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploadState.isUploading}
              >
                Seleccionar archivo
              </Button>
            </div>
          )}
        </div>

        {/* Images Grid */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Imágenes subidas</h4>
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Cargando imágenes...</p>
            </div>
          ) : images && images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {images.map((image) => (
                <div key={image.id} className="relative group border rounded-lg p-2">
                  <img
                    src={image.file_url}
                    alt={image.file_name}
                    className="w-full h-20 object-cover rounded cursor-pointer"
                    onClick={() => onImageSelect(image.file_url)}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 w-6 p-0"
                      onClick={() => onImageSelect(image.file_url)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(image.file_url)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs truncate" title={image.file_name}>
                      {image.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(image.file_size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No hay imágenes subidas aún
              </p>
            </div>
          )}
        </div>

        {/* Quick Insert URLs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Insertar desde URL</h4>
          <div className="flex gap-2">
            <Input
              placeholder="https://ejemplo.com/imagen.jpg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const url = (e.target as HTMLInputElement).value;
                  if (url) {
                    onImageSelect(url);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <Button
              size="sm"
              onClick={(e) => {
                const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                const url = input?.value;
                if (url) {
                  onImageSelect(url);
                  input.value = '';
                }
              }}
            >
              Insertar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
