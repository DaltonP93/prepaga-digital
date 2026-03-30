import { supabase } from "@/integrations/supabase/client";

interface ManagedUploadParams {
  file: File;
  bucketName: string;
  filePath: string;
  companyId?: string;
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
}

interface ManagedDeleteParams {
  bucketName: string;
  filePath: string;
}

interface ManagedUploadResult {
  id: string | null;
  path: string;
  url: string | null;
}

const getCurrentCompanyId = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autenticado");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("No se pudo obtener la empresa del usuario");
  }

  return {
    userId: user.id,
    companyId: profile.company_id as string,
  };
};

export const uploadManagedFile = async ({
  file,
  bucketName,
  filePath,
  companyId,
  entityType = "generic",
  entityId,
  isPublic = false,
}: ManagedUploadParams): Promise<ManagedUploadResult> => {
  const resolved = companyId ? { companyId } : await getCurrentCompanyId();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucketName", bucketName);
  formData.append("filePath", filePath);
  formData.append("companyId", resolved.companyId);
  formData.append("entityType", entityType);
  formData.append("isPublic", String(isPublic));
  if (entityId) formData.append("entityId", entityId);

  const { data, error } = await supabase.functions.invoke("file-manager", {
    body: formData,
  });

  if (error) throw error;
  if (!data?.success || !data?.file?.path) {
    throw new Error(data?.error || "No se pudo subir el archivo");
  }

  return {
    id: data.file.id ?? null,
    path: data.file.path as string,
    url: (data.file.url as string | null) ?? null,
  };
};

export const deleteManagedFile = async ({ bucketName, filePath }: ManagedDeleteParams) => {
  const { data, error } = await supabase.functions.invoke("file-manager", {
    body: {
      action: "delete",
      bucketName,
      filePath,
    },
  });

  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.error || "No se pudo eliminar el archivo");
  }

  return true;
};
