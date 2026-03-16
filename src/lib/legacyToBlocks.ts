import type { BlockType, TemplateBlockInsert, BlockContent, SignerRole, FieldType, TemplateFieldInsert, TemplateFieldMeta } from "@/types/templateDesigner";

/**
 * Result of parsing legacy HTML: blocks for content + fields for signatures.
 */
export interface LegacyParseResult {
  blocks: Omit<TemplateBlockInsert, "sort_order">[];
  /** Signature fields to insert into template_fields (not blocks) */
  signatureFields: Omit<TemplateFieldInsert, "id">[];
}

/**
 * Parse legacy HTML content into Designer 2.0 blocks + signature fields.
 * Signatures are emitted as template_fields, NOT as signature_block blocks.
 */
export function parseLegacyHtmlToBlocks(
  templateId: string,
  html: string
): Omit<TemplateBlockInsert, "sort_order">[] {
  const result = parseLegacyHtml(templateId, html);
  return result.blocks;
}

/**
 * Full parse returning both blocks and signature fields.
 */
export function parseLegacyHtml(
  templateId: string,
  html: string
): LegacyParseResult {
  if (!html?.trim()) return { blocks: [], signatureFields: [] };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: Omit<TemplateBlockInsert, "sort_order">[] = [];

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
    if (/^(aclaraci[oó]n|nombre|c\.?\s*i\.?|dni|documento|fecha)[:\s]*$/i.test(text)) return true;
    if (/^\{\{(titular|contratada|adherente)_(nombre|dni|firma|fecha|ci)\}\}$/.test(text.replace(/\s/g, ""))) return true;
    if (/^_{4,}$/.test(text)) return true;
    return false;
  };

  let inSignatureZone = false;

  const walk = (nodes: NodeListOf<ChildNode>) => {
    nodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (isSignatureElement(el)) {
        inSignatureZone = true;
        signatureHits.push((el.textContent || "").trim());
        return;
      }

      if (inSignatureZone && isSignatureCompanion(el)) {
        return;
      }

      if (inSignatureZone && el.textContent && el.textContent.trim().length > 80) {
        inSignatureZone = false;
      }

      // Headings
      if (["h1", "h2", "h3"].includes(tag)) {
        inSignatureZone = false;
        const level = parseInt(tag[1]) as 1 | 2 | 3;
        blocks.push({
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
        blocks.push({
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

      // Text blocks
      if (["p", "div", "ul", "ol", "li", "span", "strong", "em", "blockquote"].includes(tag)) {
        const outerHtml = el.outerHTML;
        if (!el.textContent?.trim()) return;
        if (inSignatureZone) return;
        blocks.push({
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

      walk(el.childNodes);
    });
  };

  walk(doc.body.childNodes);

  // Pass 2: If signature patterns found, emit template_fields (NOT blocks)
  const signatureFields: Omit<TemplateFieldInsert, "id">[] = [];

  if (signatureHits.length > 0) {
    const makeField = (
      role: SignerRole,
      fieldType: FieldType,
      label: string,
      fx: number,
      fy: number,
      fw: number,
      fh: number
    ): Omit<TemplateFieldInsert, "id"> => ({
      template_id: templateId,
      block_id: null,
      signer_role: role,
      field_type: fieldType,
      label,
      page: 1,
      x: fx, y: fy, w: fw, h: fh,
      required: true,
      meta: {
        relativeTo: "page",
        normalized: { x: fx, y: fy, w: fw, h: fh },
        appearance: { placeholderText: label },
      } as TemplateFieldMeta,
    });

    // Titular signature — left side (coordinates in 0..1 range for CanvasFieldOverlay)
    signatureFields.push(makeField("titular", "signature", "Firma del Contratante", 0.05, 0.80, 0.40, 0.08));
    signatureFields.push(makeField("titular", "name", "Nombre del Contratante", 0.05, 0.88, 0.40, 0.03));
    signatureFields.push(makeField("titular", "dni", "DNI del Contratante", 0.05, 0.91, 0.20, 0.03));
    signatureFields.push(makeField("titular", "date", "Fecha", 0.25, 0.91, 0.20, 0.03));

    // Contratada signature — right side
    signatureFields.push(makeField("contratada", "signature", "Firma de la Contratada", 0.55, 0.80, 0.40, 0.08));
    signatureFields.push(makeField("contratada", "name", "Nombre Representante", 0.55, 0.88, 0.40, 0.03));
    signatureFields.push(makeField("contratada", "dni", "DNI Representante", 0.55, 0.91, 0.20, 0.03));
    signatureFields.push(makeField("contratada", "date", "Fecha", 0.75, 0.91, 0.20, 0.03));
  }

  return { blocks, signatureFields };
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
