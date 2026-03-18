
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  ImageIcon, 
  Eye
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ImageManagerProps {
  onImageSelect: (url: string, storagePath?: string) => void;
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
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Fetch uploaded images
  const { data: images, isLoading, refetch } = useQuery({
    queryKey: ['template-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('id, file_name, file_url, file_size, file_type, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const imageFiles = (data || []).filter(img => 
        img.file_type?.startsWith('image/') || 
        img.file_name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
      );

      return imageFiles as UploadedImage[];
    }
  });

  // Resolve signed URLs for images that are storage paths
  useEffect(() => {
    if (!images || images.length === 0) return;
    let cancelled = false;

    const resolve = async () => {
      const newUrls: Record<string, string> = {};
      for (const img of images) {
        if (resolvedUrls[img.id]) continue;
        const url = img.file_url;
        // Already a full URL
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
          newUrls[img.id] = url;
          continue;
        }
        // It's a storage path — resolve signed URL
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(url, 3600);
          if (!error && data?.signedUrl) {
            newUrls[img.id] = data.signedUrl;
          }
        } catch {
          // Try other common bucket
          try {
            const { data, error } = await supabase.storage
              .from('avatars')
              .createSignedUrl(url, 3600);
            if (!error && data?.signedUrl) {
              newUrls[img.id] = data.signedUrl;
            }
          } catch { /* skip */ }
        }
      }
      if (!cancelled && Object.keys(newUrls).length > 0) {
        setResolvedUrls(prev => ({ ...prev, ...newUrls }));
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [images]);

  const getImageUrl = (img: UploadedImage) => {
    return resolvedUrls[img.id] || img.file_url;
  };

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
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona solo archivos de imagen');
      return;
    }

    try {
      const url = await uploadFile(file, 'documents', 'template-images');
      if (url) {
        await refetch();
        toast.success('Imagen subida exitosamente');
        onImageSelect(url);
      }
    } catch (error) {
      toast.error('Error al subir la imagen');
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageClick = (img: UploadedImage) => {
    const url = getImageUrl(img);
    // file_url is the storage path (e.g. companyId/template-images/...)
    const storagePath = img.file_url && !img.file_url.startsWith('http') ? img.file_url : undefined;
    onImageSelect(url, storagePath);
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
              : 'border-border hover:border-muted-foreground/40'
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
              <Upload className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <div>
                <p className="text-sm font-medium">Arrastra una imagen aquí</p>
                <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
              </div>
              <Button
                type="button"
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
              {images.map((image) => {
                const imgUrl = getImageUrl(image);
                const isResolved = imgUrl.startsWith('http') || imgUrl.startsWith('data:') || imgUrl.startsWith('blob:');
                return (
                  <div
                    key={image.id}
                    className="relative group border rounded-lg p-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleImageClick(image)}
                  >
                    {isResolved ? (
                      <img
                        src={imgUrl}
                        alt={image.file_name}
                        className="w-full h-20 object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-20 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 text-xs"
                        onClick={(e) => { e.stopPropagation(); handleImageClick(image); }}
                      >
                        <Eye className="w-3 h-3" /> Usar
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
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No hay imágenes subidas aún
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
