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

interface BrandingInfo {
  companyName: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  headerImageUrl: string | null;
  footerImageUrl: string | null;
}

function buildWrappedHtml(
  bodyContent: string,
  branding: BrandingInfo,
  documentName: string
): string {
  // Header: If dedicated header image exists, use it centered. Otherwise fall back to logo.
  let headerHtml: string;
  if (branding.headerImageUrl) {
    headerHtml = `<img src="${branding.headerImageUrl}" class="header-brand-image" />`;
  } else if (branding.logoUrl) {
    headerHtml = `<img src="${branding.logoUrl}" class="header-brand-image" />`;
  } else {
    headerHtml = `<span style="font-weight:700;font-size:18px;">${branding.companyName}</span>`;
  }

  // Footer: If dedicated footer image exists, use it. Otherwise fall back to text contact line.
  let footerHtml: string;
  if (branding.footerImageUrl) {
    footerHtml = `<img src="${branding.footerImageUrl}" class="footer-brand-image" />`;
  } else {
    const contactParts: string[] = [];
    if (branding.address) contactParts.push(branding.address);
    if (branding.phone) contactParts.push(branding.phone);
    if (branding.email) contactParts.push(branding.email);
    footerHtml = `<div class="contact">${contactParts.join(" | ")}</div>
    <div class="page-number">Pág. </div>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @page {
    size: A4;
    margin: 32mm 15mm 22mm 15mm;
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
    top: -28mm;
    left: 0;
    right: 0;
    height: 24mm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2mm 0;
  }
  .page-header .header-brand-image {
    display: block;
    max-width: 55%;
    max-height: 20mm;
    height: auto;
    object-fit: contain;
    object-position: center center;
  }

  /* ── Fixed footer – repeats on every page ── */
  .page-footer {
    position: fixed;
    bottom: -18mm;
    left: 0;
    right: 0;
    height: 14mm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2mm;
    font-size: 8px;
    color: #777;
  }
  .page-footer .footer-brand-image {
    display: block;
    max-width: 90%;
    max-height: 12mm;
    height: auto;
    object-fit: contain;
    object-position: center center;
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
    ${headerHtml}
  </div>

  <div class="page-footer">
    ${footerHtml}
  </div>

  <div class="content">
    ${bodyContent}
  </div>
</body>
</html>`;
}

/**
 * Strip embedded branding images (cabecera/zócalo) from template content
 * since the wrapper already adds proper header/footer via CSS fixed positioning.
 * This prevents duplicate headers/footers in the generated PDF.
 */
function normalizeLegacyContractHeader(html: string): string {
  if (!html) return html;

  // Remove leading branding images (cabecera) — the wrapper header already shows the logo
  html = html.replace(
    /^\s*(<p[^>]*>\s*)?<img\b[^>]*src="[^"]*\/company-assets\/[^"]*\/branding\/[^"]*"[^>]*\/?>\s*(<\/p>)?\s*/i,
    ''
  );

  // Remove trailing branding images (zócalo/footer) at the end of content
  html = html.replace(
    /\s*(<p[^>]*>\s*)?<img\b[^>]*src="[^"]*\/company-assets\/[^"]*\/branding\/[^"]*"[^>]*\/?>\s*(<\/p>)?\s*$/i,
    ''
  );

  return html;
}

/**
 * Resolve expired Supabase Storage signed URLs in HTML content.
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
 * Fetch an image URL and return a base64 data URI for reliable rendering.
 * Falls back to the original URL if fetching fails.
 */
async function imageUrlToDataUri(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return url;
    const contentType = resp.headers.get("content-type") || "image/png";
    const buffer = new Uint8Array(await resp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const b64 = btoa(binary);
    return `data:${contentType};base64,${b64}`;
  } catch {
    return url;
  }
}

/**
 * Resolve a storage or public URL to a fresh signed URL.
 */
async function resolveStorageUrl(
  url: string | null,
  supabaseAdmin: any
): Promise<string | null> {
  if (!url) return null;

  if (url.includes('.supabase.co/storage/v1/')) {
    // If it's a public URL, return as-is (public bucket)
    if (url.includes('/object/public/')) return url;
    
    const pathMatch = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
    if (pathMatch) {
      const bucket = pathMatch[1];
      const storagePath = decodeURIComponent(pathMatch[2]);
      const { data } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) return data.signedUrl;
    }
  }

  return url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard
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
    let branding: BrandingInfo = {
      companyName: "",
      logoUrl: null,
      phone: null,
      address: null,
      email: null,
      headerImageUrl: null,
      footerImageUrl: null,
    };

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
        branding.companyName = comp.name;
        branding.logoUrl = comp.logo_url;
        branding.phone = comp.phone;
        branding.address = comp.address;
        branding.email = comp.email;
      }

      // Fetch dedicated PDF branding images from company_settings
      const { data: settings } = await supabaseAdmin
        .from("company_settings")
        .select("pdf_header_image_url, pdf_footer_image_url")
        .eq("company_id", sale.company_id)
        .single();

      if (settings) {
        branding.headerImageUrl = settings.pdf_header_image_url || null;
        branding.footerImageUrl = settings.pdf_footer_image_url || null;
      }
    }

    // 2b. Resolve all branding URLs
    branding.logoUrl = await resolveStorageUrl(branding.logoUrl, supabaseAdmin);
    branding.headerImageUrl = await resolveStorageUrl(branding.headerImageUrl, supabaseAdmin);
    branding.footerImageUrl = await resolveStorageUrl(branding.footerImageUrl, supabaseAdmin);

    // 2c. Resolve expired image URLs in document content
    const bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
    const resolvedContent = await resolveContentImages(doc.content, supabaseAdmin, bucket);

    // 3. Build wrapped HTML with repeating header/footer
    const wrappedHtml = buildWrappedHtml(resolvedContent, branding, doc.name || "Documento");

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
          margin: { top: "30mm", right: "15mm", bottom: "22mm", left: "15mm" },
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
