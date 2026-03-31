import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildWrappedHtml(
  bodyContent: string,
  company: { name: string; logo_url: string | null; phone: string | null; address: string | null; email: string | null },
  documentName: string
): string {
  const logoHtml = company.logo_url
    ? `<img src="${company.logo_url}" class="company-header-image" />`
    : `<span style="font-weight:700;font-size:18px;">${company.name}</span>`;

  const contactParts: string[] = [];
  if (company.phone) contactParts.push(company.phone);
  if (company.email) contactParts.push(company.email);
  if (company.address) contactParts.push(company.address);
  const contactLine = contactParts.join(" | ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @page {
    size: A4;
    margin: 38mm 15mm 28mm 15mm;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #222;
    width: 100%;
  }

  /* ── Fixed header – repeats on every page ── */
  .page-header {
    position: fixed;
    top: -33mm;
    left: 0;
    right: 0;
    height: 30mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6mm;
    padding: 2mm 0;
    border-bottom: 1.5px solid #333;
  }
  .page-header .logo-area {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .page-header .company-header-image {
    display: block;
    width: 100%;
    max-width: 100%;
    max-height: 24mm;
    height: auto;
    object-fit: contain;
    object-position: left center;
  }
  .page-header .doc-name {
    font-size: 9px;
    color: #555;
    text-align: right;
    max-width: 52mm;
    min-width: 40mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── Fixed footer – repeats on every page ── */
  .page-footer {
    position: fixed;
    bottom: -23mm;
    left: 0;
    right: 0;
    height: 18mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2mm;
    border-top: 1px solid #999;
    font-size: 8px;
    color: #777;
  }
  .page-footer .contact {
    max-width: 80%;
  }
  .page-footer .page-number::after {
    content: counter(page);
  }

  /* ── Main content ── */
  .content {
    width: 100%;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  /* Ensure images in content don't overflow */
  .content img,
  .content svg,
  .content canvas,
  .content iframe {
    max-width: 100% !important;
    height: auto !important;
  }

  .content img[style*="width"],
  .content img[width] {
    width: 100% !important;
    max-width: 100% !important;
  }

  /* Table styling for content tables */
  .content table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .content table td, .content table th {
    padding: 4px 6px;
    word-break: break-word;
  }

  .content > *,
  .content .ProseMirror,
  .content [style*="width"] {
    max-width: 100% !important;
  }
</style>
</head>
<body>
  <div class="page-header">
    <div class="logo-area">${logoHtml}</div>
    <div class="doc-name">${documentName}</div>
  </div>

  <div class="page-footer">
    <div class="contact">${contactLine}</div>
    <div class="page-number">Pág. </div>
  </div>

  <div class="content">
    ${bodyContent}
  </div>
</body>
</html>`;
}

function normalizeLegacyContractHeader(html: string): string {
  if (!html) return html;

  const leadingHeaderImageRegex =
    /^\s*<img\b([^>]*?)src="([^"]*\/company-assets\/[^"]*\/branding\/[^"]+)"([^>]*)>/i;

  if (!leadingHeaderImageRegex.test(html)) {
    return html;
  }

  return html.replace(leadingHeaderImageRegex, (_match, beforeSrc, src, afterSrc) => {
    const mergedAttrs = `${beforeSrc ?? ""}${afterSrc ?? ""}`;
    const withoutStyle = mergedAttrs.replace(/\sstyle="[^"]*"/gi, "");
    const normalizedStyle = [
      "display:block",
      "width:100%",
      "max-width:100%",
      "height:auto",
      "max-height:none",
      "object-fit:contain",
      "object-position:center center",
      "margin:0 auto 12px auto",
    ].join("; ");

    return `<img${withoutStyle} src="${src}" style="${normalizedStyle}">`;
  });
}

/**
 * Resolve expired Supabase Storage signed URLs in HTML content.
 * Scans for <img> with data-storage-path and refreshes src.
 * Also handles legacy images whose src contains a supabase storage URL.
 */
async function resolveContentImages(
  html: string,
  supabaseAdmin: any,
  bucket: string
): Promise<string> {
  if (!html) return html;
  html = normalizeLegacyContractHeader(html);

  const imgRegex = /<img\s[^>]*>/gi;
  const matches = html.match(imgRegex);
  if (!matches) return html;

  let result = html;

  for (const imgTag of matches) {
    // Case 1: has data-storage-path
    const spMatch = imgTag.match(/data-storage-path="([^"]+)"/);
    if (spMatch) {
      const storagePath = spMatch[1];
      const { data } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) {
        const updatedTag = imgTag.replace(/src="[^"]*"/, `src="${data.signedUrl}"`);
        result = result.replace(imgTag, updatedTag);
      }
      continue;
    }

    // Case 2: legacy — src contains supabase storage URL
    const srcMatch = imgTag.match(/src="([^"]+)"/);
    if (!srcMatch) continue;
    const src = srcMatch[1];

    if (src.includes('.supabase.co/storage/v1/')) {
      const pathMatch = src.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
      if (pathMatch) {
        const srcBucket = pathMatch[1];
        const storagePath = decodeURIComponent(pathMatch[2]);
        const { data } = await supabaseAdmin.storage
          .from(srcBucket)
          .createSignedUrl(storagePath, 3600);
        if (data?.signedUrl) {
          const updatedTag = imgTag.replace(/src="[^"]*"/, `src="${data.signedUrl}"`);
          result = result.replace(imgTag, updatedTag);
        }
      }
    }
  }

  return normalizeLegacyContractHeader(result);
}

/**
 * Resolve a company logo URL if it's a Supabase storage URL.
 */
async function resolveLogoUrl(
  logoUrl: string | null,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string | null> {
  if (!logoUrl) return null;

  // If it's a supabase storage URL, generate a fresh signed URL
  if (logoUrl.includes('.supabase.co/storage/v1/')) {
    const pathMatch = logoUrl.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
    if (pathMatch) {
      const bucket = pathMatch[1];
      const storagePath = decodeURIComponent(pathMatch[2]);
      const { data } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) return data.signedUrl;
    }
  }

  return logoUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard: require service-role key or valid JWT
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceCall = authHeader === `Bearer ${serviceKey}`;
    if (!isServiceCall) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser();
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch document
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select("id, sale_id, content, name")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!doc.content) {
      return new Response(JSON.stringify({ error: "Document has no HTML content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch company info via sale
    let company = { name: "", logo_url: null as string | null, phone: null as string | null, address: null as string | null, email: null as string | null };
    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select("company_id")
      .eq("id", doc.sale_id)
      .single();

    if (sale?.company_id) {
      const { data: comp } = await supabaseAdmin
        .from("companies")
        .select("name, logo_url, phone, address, email")
        .eq("id", sale.company_id)
        .single();
      if (comp) {
        company = comp;
      }
    }

    // 2b. Resolve company logo URL
    company.logo_url = await resolveLogoUrl(company.logo_url, supabaseAdmin);

    // 2c. Resolve expired image URLs in document content
    const bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
    const resolvedContent = await resolveContentImages(doc.content, supabaseAdmin, bucket);

    // 3. Build wrapped HTML with repeating header/footer
    const wrappedHtml = buildWrappedHtml(resolvedContent, company, doc.name || "Documento");

    // 4. Call render service
    const renderUrl = Deno.env.get("RENDER_URL");
    const renderKey = Deno.env.get("RENDER_KEY");
    if (!renderUrl || !renderKey) {
      return new Response(JSON.stringify({ error: "RENDER_URL or RENDER_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const renderResponse = await fetch(renderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RENDER-KEY": renderKey,
      },
      body: JSON.stringify({
        html: wrappedHtml,
        options: {
          format: "A4",
          printBackground: true,
          margin: { top: "35mm", right: "15mm", bottom: "28mm", left: "15mm" },
        },
      }),
    });

    if (!renderResponse.ok) {
      const errText = await renderResponse.text();
      console.error("Render service error:", errText);
      return new Response(JSON.stringify({ error: "Render service failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = new Uint8Array(await renderResponse.arrayBuffer());

    // 5. Calculate SHA-256
    const hash = await sha256Hex(pdfBytes);

    // 6. Upload to Storage
    const storagePath = `contracts/base/${doc.sale_id}/${doc.id}.pdf`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Storage upload failed", details: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Update document record
    const basePdfUrl = `${bucket}:${storagePath}`;
    const { error: updateErr } = await supabaseAdmin
      .from("documents")
      .update({
        base_pdf_url: basePdfUrl,
        base_pdf_hash: hash,
      })
      .eq("id", document_id);

    if (updateErr) {
      console.error("Document update error:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        base_pdf_url: basePdfUrl,
        base_pdf_hash: hash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("generate-base-pdf error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
