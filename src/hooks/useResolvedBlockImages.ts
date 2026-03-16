import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateBlock } from "@/types/templateDesigner";

/**
 * Resolves signed URLs for image blocks whose `content.storage_path` is set.
 * Returns a map blockId → signedUrl.
 */
export function useResolvedBlockImages(blocks: TemplateBlock[]) {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});

  const imageBlocks = blocks.filter(
    (b) => b.block_type === "image" && (b.content as any)?.storage_path
  );

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const newEntries: Record<string, string> = {};

      for (const block of imageBlocks) {
        const content = block.content as any;
        const storagePath = content.storage_path as string;

        // Skip if already resolved and not expired (check every render)
        if (urlMap[block.id] && content.src?.startsWith("http")) continue;

        try {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(storagePath, 3600);
          if (!error && data?.signedUrl) {
            newEntries[block.id] = data.signedUrl;
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled && Object.keys(newEntries).length > 0) {
        setUrlMap((prev) => ({ ...prev, ...newEntries }));
      }
    };

    if (imageBlocks.length > 0) resolve();

    return () => { cancelled = true; };
  }, [imageBlocks.map((b) => b.id + (b.content as any)?.storage_path).join(",")]);

  const getResolvedUrl = useCallback(
    (blockId: string, fallbackSrc?: string) => urlMap[blockId] || fallbackSrc || "",
    [urlMap]
  );

  return { urlMap, getResolvedUrl };
}
