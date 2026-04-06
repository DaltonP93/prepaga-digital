import { supabase } from "@/integrations/supabase/client";
import { sanitizeMediaUrl } from "@/lib/mediaUrl";

function normalizeCompanyAssetPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutProtocol = trimmed.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/company-assets\//i, "");
  const withoutBucketPrefix = withoutProtocol.replace(/^company-assets\//i, "");

  return withoutBucketPrefix.replace(/^\/+/, "");
}

export function resolveCompanyAssetUrl(value?: string | null): string | undefined {
  const safeUrl = sanitizeMediaUrl(value);
  if (safeUrl) return safeUrl;
  if (!value) return undefined;

  const path = normalizeCompanyAssetPath(value);
  if (!path) return undefined;

  const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
  return data?.publicUrl || undefined;
}
