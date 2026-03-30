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

      // 1. Get user and company_id
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('No autenticado');

      setUploadState(prev => ({ ...prev, progress: 10 }));

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profErr || !profile?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const companyId = profile.company_id;
      setUploadState(prev => ({ ...prev, progress: 20 }));

      // 2. Build company-scoped path (required by storage RLS)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${safeName}`;
      const subPath = path || 'general';
      const filePath = `${companyId}/${subPath}/${fileName}`;

      // 3. Upload
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw new Error(`Error al subir archivo: ${error.message}`);

      setUploadState(prev => ({ ...prev, progress: 60 }));

      // 4. Track file upload in database (best-effort)
      await supabase
        .from('file_uploads')
        .insert({
          uploaded_by: user.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: data.path,
          company_id: companyId,
        })
        .then(({ error: dbErr }) => {
          if (dbErr) {}
        });

      setUploadState(prev => ({ ...prev, progress: 80 }));

      // 5. Generate signed URL for private bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.path, 3600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        setUploadState({ progress: 100, isUploading: false, error: null });
        return data.path;
      }

      setUploadState({ progress: 100, isUploading: false, error: null });
      return signedUrlData.signedUrl;
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
