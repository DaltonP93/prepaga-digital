import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves expired Supabase Storage signed URLs in HTML content.
 *
 * 1. Finds `<img>` tags with `data-storage-path` and refreshes their `src`.
 * 2. Auto-migrates legacy images whose `src` contains a Supabase storage URL
 *    but lack `data-storage-path` — extracts the path and refreshes.
 */
export async function resolveStorageImages(html: string): Promise<string> {
  if (!html) return html;

  const imgRegex = /<img\s[^>]*>/gi;
  const matches = html.match(imgRegex);
  if (!matches) return html;

  let result = html;

  for (const imgTag of matches) {
    // Case 1: has data-storage-path
    const spMatch = imgTag.match(/data-storage-path="([^"]+)"/);
    if (spMatch) {
      const storagePath = spMatch[1];
      const freshUrl = await getSignedUrl(storagePath);
      if (freshUrl) {
        // Replace src value in this img tag
        const updatedTag = imgTag.replace(/src="[^"]*"/, `src="${freshUrl}"`);
        result = result.replace(imgTag, updatedTag);
      }
      continue;
    }

    // Case 2: legacy — src contains supabase storage URL but no data-storage-path
    const srcMatch = imgTag.match(/src="([^"]+)"/);
    if (!srcMatch) continue;
    const src = srcMatch[1];

    // Detect supabase storage URLs
    const storagePathFromUrl = extractStoragePathFromUrl(src);
    if (storagePathFromUrl) {
      const freshUrl = await getSignedUrl(storagePathFromUrl);
      if (freshUrl) {
        // Add data-storage-path AND refresh src
        const updatedTag = imgTag
          .replace(/src="[^"]*"/, `src="${freshUrl}" data-storage-path="${storagePathFromUrl}"`)
        result = result.replace(imgTag, updatedTag);
      }
    }
  }

  return result;
}

/**
 * Extract storage path from a Supabase signed/public URL.
 * e.g. https://xxx.supabase.co/storage/v1/object/sign/documents/companyId/... → companyId/...
 */
function extractStoragePathFromUrl(url: string): string | null {
  if (!url.includes('.supabase.co/storage/v1/')) return null;

  // Pattern: /storage/v1/object/(sign|public)/documents/REST_IS_PATH
  const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/documents\/([^?]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

async function getSignedUrl(storagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // ignore
  }
  return null;
}
