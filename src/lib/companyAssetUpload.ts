import { supabase } from "@/integrations/supabase/client";

interface UploadCompanyAssetParams {
  file: File;
  companyId: string;
  folder: string;
  entityType?: string;
  entityId?: string;
}

const sanitizeSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9/_-]/g, "-");

export const uploadCompanyAsset = async ({
  file,
  companyId,
  folder,
  entityType = "branding",
  entityId,
}: UploadCompanyAssetParams) => {
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `${sanitizeSegment(companyId)}/${sanitizeSegment(folder)}/${Date.now()}.${sanitizeSegment(ext)}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucketName", "company-assets");
  formData.append("isPublic", "true");
  formData.append("filePath", filePath);
  formData.append("companyId", companyId);
  formData.append("entityType", entityType);
  if (entityId) formData.append("entityId", entityId);

  const { data, error } = await supabase.functions.invoke("file-manager", {
    body: formData,
  });

  if (error) throw error;
  if (!data?.success || !data?.file?.url) {
    throw new Error(data?.error || "No se pudo subir el archivo de marca");
  }

  return data.file.url as string;
};
