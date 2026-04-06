import { supabase } from "@/integrations/supabase/client";

const urlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get a signed URL for an asset stored in the private `documents` bucket.
 * Caches URLs for 50 minutes (signed for 60 min).
 */
export async function getAssetSignedUrl(filePath: string): Promise<string> {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const cached = urlCache.get(filePath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    console.error("Failed to get signed URL:", error);
    return "";
  }

  urlCache.set(filePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + 50 * 60 * 1000, // cache 50 min
  });

  return data.signedUrl;
}

/** Clear the URL cache (e.g. on logout) */
export function clearAssetUrlCache() {
  urlCache.clear();
}

export async function getDocumentAccessUrl(filePath: string): Promise<string> {
  return getAssetSignedUrl(filePath);
}
