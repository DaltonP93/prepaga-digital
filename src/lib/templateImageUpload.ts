import { supabase } from "@/integrations/supabase/client";

export interface TemplateImageUploadResult {
  storagePath: string;
  signedUrl: string;
  companyId: string;
}

/**
 * Upload an image to the private `documents` bucket using the correct
 * company-scoped path required by the storage RLS policy.
 *
 * Path pattern: {companyId}/template-images/{context}/{timestamp}-{fileName}
 */
export async function uploadTemplateImage(
  file: File,
  context: string // e.g. templateId or "general"
): Promise<TemplateImageUploadResult> {
  // 1. Auth
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("No autenticado");

  // 2. Company ID
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profErr || !profile?.company_id) {
    throw new Error("No se pudo obtener la empresa del usuario");
  }

  const companyId = profile.company_id;

  // 3. Validate MIME
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}`);
  }

  // 4. Build company-scoped path
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${companyId}/template-images/${context}/${Date.now()}-${safeName}`;

  // 5. Upload
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });

  if (upErr) throw new Error(`Error al subir archivo: ${upErr.message}`);

  // 6. Signed URL
  const { data: signedData, error: signErr } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signedData?.signedUrl) {
    throw new Error("Error al generar URL firmada");
  }

  // 7. Track in file_uploads (best-effort)
  await supabase.from("file_uploads").insert({
    uploaded_by: user.id,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    file_url: storagePath,
    company_id: companyId,
  }).then(({ error }) => {
    if (error) console.warn("file_uploads insert failed (non-critical):", error.message);
  });

  return { storagePath, signedUrl: signedData.signedUrl, companyId };
}
