
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

export const useFileUpload = () => {
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
    error: null,
  });
  const { toast } = useToast();

  const uploadFile = async (
    file: File,
    bucket: string,
    path?: string
  ): Promise<string | null> => {
    try {
      setUploadState({ progress: 0, isUploading: true, error: null });

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Track file upload in database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          bucket_name: bucket,
          file_path: data.path,
          upload_status: 'completed',
        });

      if (dbError) {
        console.error('Error tracking file upload:', dbError);
      }

      setUploadState({ progress: 100, isUploading: false, error: null });

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido exitosamente.",
      });

      return urlData.publicUrl;
    } catch (error: any) {
      setUploadState({ progress: 0, isUploading: false, error: error.message });
      toast({
        title: "Error",
        description: error.message || "Error al subir el archivo.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;

      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado exitosamente.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el archivo.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploadState,
  };
};
