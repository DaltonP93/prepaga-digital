import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const uploadFile = async (
    file: File,
    bucket: string,
    path?: string
  ): Promise<string | null> => {
    try {
      setUploadState({ progress: 0, isUploading: true, error: null });

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      setUploadState(prev => ({ ...prev, progress: 20 }));

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setUploadState(prev => ({ ...prev, progress: 60 }));

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id || '')
        .single();

      setUploadState(prev => ({ ...prev, progress: 80 }));

      // Track file upload in database using correct schema
      await supabase
        .from('file_uploads')
        .insert({
          uploaded_by: user?.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: data.path,
          company_id: profile?.company_id,
        });

      setUploadState(prev => ({ ...prev, progress: 100 }));

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setUploadState({ progress: 100, isUploading: false, error: null });

      return urlData.publicUrl;
    } catch (error: any) {
      setUploadState({ progress: 0, isUploading: false, error: error.message });
      toast.error(error.message || 'Error al subir el archivo');
      return null;
    }
  };

  const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      toast.success('Archivo eliminado exitosamente');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el archivo');
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploadState,
  };
};
