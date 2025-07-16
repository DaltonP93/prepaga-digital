import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadOptions {
  bucketName?: string;
  isPublic?: boolean;
  onProgress?: (progress: number) => void;
}

interface FileManagerFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  url?: string;
  signed_url?: string;
  created_at: string;
}

export const useFileManager = () => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, options = {} }: { file: File; options?: FileUploadOptions }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucketName', options.bucketName || 'documents');
      formData.append('isPublic', String(options.isPublic || false));

      const { data, error } = await supabase.functions.invoke('file-manager', {
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({
        title: "Archivo subido",
        description: `${data.file.name} se subió correctamente.`
      });
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Error al subir archivo",
        description: error.message || "No se pudo subir el archivo",
        variant: "destructive"
      });
      setUploadProgress(0);
    }
  });

  // List files query
  const {
    data: filesData,
    isLoading: isLoadingFiles,
    error: filesError
  } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('file-manager', {
        body: { action: 'list', limit: 100, offset: 0 }
      });

      if (error) throw error;
      return data;
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { data, error } = await supabase.functions.invoke('file-manager', {
        body: { fileId, action: 'delete' }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({
        title: "Archivo eliminado",
        description: "El archivo se eliminó correctamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar archivo",
        description: error.message || "No se pudo eliminar el archivo",
        variant: "destructive"
      });
    }
  });

  // Get signed URL mutation
  const getSignedUrlMutation = useMutation({
    mutationFn: async ({ filePath, bucketName, expiresIn = 3600 }: {
      filePath: string;
      bucketName: string;
      expiresIn?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('file-manager', {
        body: { filePath, bucketName, expiresIn, action: 'get-url' }
      });

      if (error) throw error;
      return data;
    }
  });

  // Upload multiple files
  const uploadMultipleFiles = async (files: File[], options?: FileUploadOptions) => {
    const uploadPromises = files.map(file => 
      uploadFileMutation.mutateAsync({ file, options })
    );
    
    try {
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      throw error;
    }
  };

  // Validate file before upload
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo excede el límite de 10MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no permitido' };
    }

    return { valid: true };
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    // State
    files: filesData?.files || [],
    uploadProgress,
    isLoadingFiles,
    filesError,
    
    // Actions
    uploadFile: uploadFileMutation.mutate,
    uploadMultipleFiles,
    deleteFile: deleteFileMutation.mutate,
    getSignedUrl: getSignedUrlMutation.mutate,
    
    // Loading states
    isUploading: uploadFileMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isGettingUrl: getSignedUrlMutation.isPending,
    
    // Utilities
    validateFile,
    formatFileSize
  };
};