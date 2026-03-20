import { supabase } from "@/integrations/supabase/client";

export interface TemplateImageUploadResult {
  storagePath: string;
  signedUrl: string;
  companyId: string;
}

/**
 * Upload a template image to the PUBLIC `company-assets` bucket.
 * This ensures <img> tags in template HTML are always accessible,
 * including on the public signing page (/firmar/:token).
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

  // 5. Upload to company-assets (PUBLIC bucket — required for <img> tags to work
  //    in template previews and the public signing page without auth headers)
  const { error: upErr } = await supabase.storage
    .from("company-assets")
    .upload(storagePath, file, { cacheControl: "31536000", upsert: false });

  if (upErr) throw new Error(`Error al subir archivo: ${upErr.message}`);

  // 6. Permanent public URL (no expiry)
  const { data: publicData } = supabase.storage
    .from("company-assets")
    .getPublicUrl(storagePath);

  const signedUrl = publicData.publicUrl;

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

  return { storagePath, signedUrl, companyId };
}
