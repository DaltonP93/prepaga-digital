
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
      console.log('🚀 Starting file upload:', file.name, file.type, file.size);
      setUploadState({ progress: 0, isUploading: true, error: null });

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      console.log('📁 Upload path:', filePath);

      // Simulate progress updates
      setUploadState(prev => ({ ...prev, progress: 20 }));

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw error;
      }

      console.log('✅ File uploaded to storage:', data.path);
      setUploadState(prev => ({ ...prev, progress: 60 }));

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError);
        throw new Error('User not authenticated');
      }

      console.log('👤 User authenticated:', user.id);
      setUploadState(prev => ({ ...prev, progress: 80 }));

      // Track file upload in database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          bucket_name: bucket,
          file_path: data.path,
          upload_status: 'completed',
        });

      if (dbError) {
        console.error('❌ Database tracking error:', dbError);
        // Don't throw here, as the file was successfully uploaded
      } else {
        console.log('✅ File tracked in database');
      }

      setUploadState(prev => ({ ...prev, progress: 100 }));

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      console.log('🔗 Generated public URL:', urlData.publicUrl);

      setUploadState({ progress: 100, isUploading: false, error: null });

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
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
