import type { BlockType, TemplateBlockInsert, BlockContent, SignerRole } from "@/types/templateDesigner";

/**
 * Parse legacy HTML content into an array of Designer 2.0 block inserts.
 * Uses DOMParser to walk the HTML and produce heading, text, table,
 * signature_block and placeholder_chip blocks.
 */
export function parseLegacyHtmlToBlocks(
  templateId: string,
  html: string
): Omit<TemplateBlockInsert, "sort_order">[] {
  if (!html?.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const results: Omit<TemplateBlockInsert, "sort_order">[] = [];

  const base = {
    template_id: templateId,
    page: 1,
    x: 0, y: 0, w: 100, h: 0,
    z_index: 0, rotation: 0,
    is_locked: false, is_visible: true,
    visibility_rules: { roles: ["titular", "adherente", "contratada"] as SignerRole[], conditions: [] },
  };

  const signatureHits: string[] = [];

  /** Detect signature-zone elements (firma lines, underscores) */
  const isSignatureElement = (el: HTMLElement): boolean => {
    const text = el.textContent || "";
    return /firma[:\s]*_{3,}/i.test(text) || /firma\s+del\s+(contratante|cliente|titular|contratada|representante|empresa)/i.test(text);
  };

  /** Detect signature-zone companion elements (Aclaración, C.I., placeholders like {{titular_nombre}}) */
  const isSignatureCompanion = (el: HTMLElement): boolean => {
    const text = (el.textContent || "").trim();
    if (!text) return false;
    // Short lines that are labels for the signature area
    if (/^(aclaraci[oó]n|nombre|c\.?\s*i\.?|dni|documento|fecha)[:\s]*$/i.test(text)) return true;
    // Lines that are ONLY a placeholder like {{titular_nombre}} or {{titular_dni}}
    if (/^\{\{(titular|contratada|adherente)_(nombre|dni|firma|fecha|ci)\}\}$/.test(text.replace(/\s/g, ""))) return true;
    // Bare underscores used as signature lines
    if (/^_{4,}$/.test(text)) return true;
    return false;
  };

  let inSignatureZone = false;

  const walk = (nodes: NodeListOf<ChildNode>) => {
    nodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Once we hit a signature element, mark the zone — everything after is companion content
      if (isSignatureElement(el)) {
        inSignatureZone = true;
        signatureHits.push((el.textContent || "").trim());
        return;
      }

      // Skip companion content that belongs to the signature zone
      if (inSignatureZone && isSignatureCompanion(el)) {
        return;
      }

      // If we're in signature zone but hit real content, exit the zone
      if (inSignatureZone && el.textContent && el.textContent.trim().length > 80) {
        inSignatureZone = false;
      }

      // Headings
      if (["h1", "h2", "h3"].includes(tag)) {
        inSignatureZone = false; // A heading always resets
        const level = parseInt(tag[1]) as 1 | 2 | 3;
        results.push({
          ...base,
          block_type: "heading" as BlockType,
          content: {
            kind: "heading",
            level,
            text: el.textContent?.trim() || "",
            placeholder_refs: extractPlaceholders(el.textContent || ""),
          } as any,
          style: {
            fontFamily: "Inter",
            fontSize: level === 1 ? 20 : level === 2 ? 16 : 14,
            fontWeight: 700,
            textAlign: "center",
            color: "#111827",
            marginBottom: 16,
          },
        });
        return;
      }

      // Tables
      if (tag === "table") {
        results.push({
          ...base,
          block_type: "table" as BlockType,
          content: {
            kind: "table",
            source: "custom",
            columns: [],
            header: true,
            striped: false,
            empty_state: "Sin datos",
          } as any,
          style: { fontSize: 11, headerBackground: "#f3f4f6", borderColor: "#d1d5db", cellPadding: 8 },
        });
        return;
      }

      // Text blocks (p, div, ul, ol, li, span with content)
      if (["p", "div", "ul", "ol", "li", "span", "strong", "em", "blockquote"].includes(tag)) {
        const outerHtml = el.outerHTML;
        if (!el.textContent?.trim()) return;
        // Skip short signature-zone leftovers
        if (inSignatureZone) return;
        results.push({
          ...base,
          block_type: "text" as BlockType,
          content: {
            kind: "rich_text",
            html: outerHtml,
            plain_text: el.textContent?.trim() || "",
            semantic_role: "paragraph",
            placeholder_refs: extractPlaceholders(el.textContent || ""),
          } as any,
          style: {
            fontFamily: "Inter", fontSize: 12, fontWeight: 400,
            lineHeight: 1.5, textAlign: "left", color: "#111827",
            padding: 0, marginTop: 0, marginBottom: 8,
          },
        });
        return;
      }

      // Recurse for wrappers
      walk(el.childNodes);
    });
  };

  walk(doc.body.childNodes);

  // Pass 2: If any signature patterns were found, emit exactly 2 signature blocks
  if (signatureHits.length > 0) {
    const makeSignatureBlock = (role: "titular" | "contratada", label: string) => ({
      ...base,
      h: 15,
      block_type: "signature_block" as BlockType,
      content: {
        kind: "signature_block",
        signer_role: role,
        signature_mode: "electronic",
        show_name: true, show_dni: true, show_timestamp: true,
        show_ip: false, show_method: true,
        label,
        preset: "legal_v2",
      } as any,
      style: { align: "left", size: "normal", borderTop: true, paddingTop: 12, fontSize: 11 },
    });

    results.push(makeSignatureBlock("titular", "Firma del Contratante"));
    results.push(makeSignatureBlock("contratada", "Firma de la Contratada"));
  }

  return results;
}

function extractPlaceholders(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    keys.push(m[1].trim());
  }
  return keys;
}
