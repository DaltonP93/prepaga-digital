import { supabase } from "@/integrations/supabase/client";

interface UploadSaleDocumentParams {
  file: File;
  saleId: string;
  entityType?: string;
}

const sanitizeSegment = (value: string) => value.replace(/[^a-zA-Z0-9/_-]/g, "-");

export const uploadSaleDocumentFile = async ({
  file,
  saleId,
  entityType = "sale_document",
}: UploadSaleDocumentParams) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Usuario no autenticado");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("No se encontró la empresa del usuario");
  }

  const ext = file.name.split(".").pop() || "bin";
  const safeExt = sanitizeSegment(ext);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const filePath =
    `${sanitizeSegment(profile.company_id)}/sale-documents/` +
    `${sanitizeSegment(saleId)}/${Date.now()}-${randomSuffix}.${safeExt}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucketName", "documents");
  formData.append("isPublic", "false");
  formData.append("filePath", filePath);
  formData.append("companyId", profile.company_id);
  formData.append("entityType", entityType);
  formData.append("entityId", saleId);

  const { data, error } = await supabase.functions.invoke("file-manager", {
    body: formData,
  });

  if (error) {
    throw error;
  }

  if (!data?.success || !data?.file?.path) {
    throw new Error(data?.error || "No se pudo subir el documento");
  }

  return {
    filePath: data.file.path as string,
    companyId: profile.company_id as string,
    userId: user.id,
  };
};
