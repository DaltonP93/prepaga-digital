import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deleteManagedFile, uploadManagedFile } from '@/lib/storageFileManager';
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

      // 3. Upload via Edge Function to avoid Storage RLS failures
      const data = await uploadManagedFile({
        file,
        bucketName: bucket,
        filePath,
        companyId,
        entityType: 'generic_upload',
      });

      setUploadState(prev => ({ ...prev, progress: 60 }));

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
      await deleteManagedFile({ bucketName: bucket, filePath: path });
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
