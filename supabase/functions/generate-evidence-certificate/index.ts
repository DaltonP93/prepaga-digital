import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(input: string): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTemplate(html: string, data: Record<string, string | null | undefined>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const value = data[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDatePY(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const CERTIFICATE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Certificado de Evidencia Legal</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; line-height: 1.45; margin: 0; padding: 0; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #d1d5db; padding-bottom: 12px; margin-bottom: 18px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { max-height: 56px; max-width: 140px; object-fit: contain; }
    .brand-text h1 { margin: 0; font-size: 20px; color: #111827; }
    .brand-text p { margin: 4px 0 0 0; color: #4b5563; font-size: 11px; }
    .badge { font-size: 11px; font-weight: bold; color: #065f46; background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 6px 10px; }
    .section { margin-bottom: 18px; page-break-inside: avoid; }
    .section h2 { font-size: 14px; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; color: #111827; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
    .field { margin-bottom: 8px; }
    .label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin-bottom: 2px; }
    .value { font-size: 12px; color: #111827; word-break: break-word; }
    .mono { font-family: "Courier New", monospace; font-size: 11px; word-break: break-all; }
    .summary-box { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 8px; padding: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; text-align: left; word-break: break-word; }
    th { background: #f3f4f6; font-size: 11px; color: #111827; }
    td { font-size: 11px; color: #1f2937; }
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #6b7280; }
    .small { font-size: 10px; color: #6b7280; }
    .mt-8 { margin-top: 8px; }
    .mt-12 { margin-top: 12px; }
    .mt-16 { margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {{companyLogo}}
      <div class="brand-text">
        <h1>Certificado de Evidencia Legal</h1>
        <p>{{companyName}}</p>
      </div>
    </div>
    <div class="badge">EVIDENCIA GENERADA</div>
  </div>

  <div class="section">
    <div class="summary-box">
      <div class="grid-2">
        <div class="field">
          <span class="label">Documento</span>
          <span class="value">{{documentName}}</span>
        </div>
        <div class="field">
          <span class="label">Tipo de documento</span>
          <span class="value">{{documentType}}</span>
        </div>
        <div class="field">
          <span class="label">Número de contrato</span>
          <span class="value">{{contractNumber}}</span>
        </div>
        <div class="field">
          <span class="label">Fecha de emisión del certificado</span>
          <span class="value">{{certificateIssuedAt}}</span>
        </div>
        <div class="field">
          <span class="label">ID de venta</span>
          <span class="value mono">{{saleId}}</span>
        </div>
        <div class="field">
          <span class="label">ID de documento</span>
          <span class="value mono">{{documentId}}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>1. Identificación del firmante</h2>
    <div class="grid-2">
      <div class="field">
        <span class="label">Nombre del firmante</span>
        <span class="value">{{signerName}}</span>
      </div>
      <div class="field">
        <span class="label">Rol</span>
        <span class="value">{{recipientType}}</span>
      </div>
      <div class="field">
        <span class="label">Email</span>
        <span class="value">{{signerEmail}}</span>
      </div>
      <div class="field">
        <span class="label">Teléfono</span>
        <span class="value">{{signerPhone}}</span>
      </div>
      <div class="field">
        <span class="label">Orden de firma</span>
        <span class="value">{{stepOrder}}</span>
      </div>
      <div class="field">
        <span class="label">ID del signature link</span>
        <span class="value mono">{{signatureLinkId}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>2. Evidencia técnica</h2>
    <div class="grid-2">
      <div class="field">
        <span class="label">Hash PDF base (SHA-256)</span>
        <span class="value mono">{{basePdfHash}}</span>
      </div>
      <div class="field">
        <span class="label">Hash PDF firmado (SHA-256)</span>
        <span class="value mono">{{signedPdfHash}}</span>
      </div>
      <div class="field">
        <span class="label">Token o referencia</span>
        <span class="value mono">{{tokenReference}}</span>
      </div>
      <div class="field">
        <span class="label">Método de firma</span>
        <span class="value">{{signatureMethod}}</span>
      </div>
      <div class="field">
        <span class="label">IP del firmante</span>
        <span class="value mono">{{ipAddress}}</span>
      </div>
      <div class="field">
        <span class="label">User-Agent</span>
        <span class="value mono">{{userAgent}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>3. Validación de identidad y consentimiento</h2>
    <div class="grid-2">
      <div class="field">
        <span class="label">Método de verificación</span>
        <span class="value">{{otpMethod}}</span>
      </div>
      <div class="field">
        <span class="label">Resultado OTP</span>
        <span class="value">{{otpResult}}</span>
      </div>
      <div class="field">
        <span class="label">Verificado en</span>
        <span class="value">{{otpVerifiedAt}}</span>
      </div>
      <div class="field">
        <span class="label">Versión de consentimiento</span>
        <span class="value">{{consentVersion}}</span>
      </div>
      <div class="field">
        <span class="label">Consentimiento otorgado</span>
        <span class="value">{{consentAccepted}}</span>
      </div>
      <div class="field">
        <span class="label">Consentimiento registrado en</span>
        <span class="value">{{consentCreatedAt}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>4. Cronología del proceso</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha / Hora</th>
          <th>Evento</th>
          <th>Actor</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        {{eventsRows}}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>5. Observaciones</h2>
    <div class="summary-box">
      <p class="small">
        Este certificado resume la evidencia técnica, operativa y cronológica asociada al proceso de firma del documento identificado en el presente. La integridad del documento firmado puede verificarse mediante el hash SHA-256 consignado y su archivo final asociado.
      </p>
    </div>
  </div>

  <div class="footer">
    <p>Empresa: {{companyName}}</p>
    <p>Documento: {{documentName}} ({{documentType}})</p>
    <p>Certificado emitido: {{certificateIssuedAt}}</p>
    <p>Este certificado fue generado automáticamente por el sistema de firma digital y evidencia legal.</p>
  </div>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, signature_link_id } = await req.json();
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

    // 1. Fetch document + sale + company
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select("id, sale_id, name, document_type, base_pdf_hash, signed_pdf_hash, signed_at, status")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select("id, contract_number, company_id, companies:company_id(name, logo_url)")
      .eq("id", doc.sale_id)
      .single();

    const companyName = (sale?.companies as any)?.name || "Empresa";
    const companyLogoUrl = (sale?.companies as any)?.logo_url || null;

    // 2. Fetch signature link
    let link: any = null;
    if (signature_link_id) {
      const { data } = await supabaseAdmin
        .from("signature_links")
        .select("id, token, recipient_type, recipient_email, recipient_phone, recipient_name, step_order, ip_addresses, completed_at")
        .eq("id", signature_link_id)
        .single();
      link = data;
    }

    // 3. Fetch signature events
    const { data: sigEvents = [] } = await supabaseAdmin
      .from("signature_events")
      .select("*")
      .eq("document_id", document_id)
      .order("timestamp", { ascending: true });

    // 4. Fetch identity verification
    let verification: any = null;
    if (signature_link_id) {
      const { data } = await supabaseAdmin
        .from("signature_identity_verification")
        .select("*")
        .eq("signature_link_id", signature_link_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      verification = data;
    }

    // 5. Fetch consent records
    let consent: any = null;
    if (signature_link_id) {
      const { data } = await supabaseAdmin
        .from("signature_consent_records")
        .select("*")
        .eq("signature_link_id", signature_link_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      consent = data;
    }

    // 6. Fetch process traces for timeline
    const { data: traces = [] } = await supabaseAdmin
      .from("process_traces")
      .select("*")
      .eq("sale_id", doc.sale_id)
      .order("created_at", { ascending: true });

    // 7. Build events rows
    const timelineEvents: Array<{ date: string; event: string; actor: string; detail: string }> = [];

    for (const t of traces || []) {
      timelineEvents.push({
        date: formatDatePY(t.created_at),
        event: t.action || "trace",
        actor: (t.details as any)?.recipient_type || "sistema",
        detail: (t.details as any)?.description || JSON.stringify(t.details || {}).substring(0, 120),
      });
    }

    for (const se of sigEvents || []) {
      timelineEvents.push({
        date: formatDatePY(se.timestamp),
        event: `signature_event (${se.signature_method || "n/a"})`,
        actor: "sistema",
        detail: `Hash: ${(se.signed_pdf_hash || "").substring(0, 16)}…`,
      });
    }

    timelineEvents.sort((a, b) => a.date.localeCompare(b.date));

    const eventsRows = timelineEvents.length > 0
      ? timelineEvents.map((e) => `<tr><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.event)}</td><td>${escapeHtml(e.actor)}</td><td>${escapeHtml(e.detail)}</td></tr>`).join("")
      : `<tr><td colspan="4" style="text-align:center;color:#6b7280;">Sin eventos registrados</td></tr>`;

    // 8. Build IP / UA from link
    const ipAddress = link?.ip_addresses
      ? (Array.isArray(link.ip_addresses) ? link.ip_addresses.join(", ") : String(link.ip_addresses))
      : "—";

    // Try to get user agent from workflow steps or traces
    let userAgent = "—";
    if (signature_link_id) {
      const { data: steps } = await supabaseAdmin
        .from("signature_workflow_steps")
        .select("data")
        .eq("signature_link_id", signature_link_id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (steps && steps.length > 0) {
        userAgent = (steps[0].data as any)?.user_agent || "—";
      }
    }

    const nowIso = new Date().toISOString();

    const companyLogo = companyLogoUrl
      ? `<img src="${escapeHtml(companyLogoUrl)}" alt="Logo" />`
      : "";

    const templateData: Record<string, string> = {
      companyName: escapeHtml(companyName),
      companyLogo,
      documentName: escapeHtml(doc.name || ""),
      documentType: escapeHtml(doc.document_type || "documento"),
      contractNumber: escapeHtml(sale?.contract_number || "—"),
      certificateIssuedAt: formatDatePY(nowIso),
      saleId: escapeHtml(doc.sale_id),
      documentId: escapeHtml(doc.id),
      signerName: escapeHtml(link?.recipient_name || link?.recipient_email || "—"),
      recipientType: escapeHtml(link?.recipient_type || "—"),
      signerEmail: escapeHtml(link?.recipient_email || "—"),
      signerPhone: escapeHtml(link?.recipient_phone || "—"),
      stepOrder: String(link?.step_order ?? "—"),
      signatureLinkId: escapeHtml(signature_link_id || "—"),
      basePdfHash: escapeHtml(doc.base_pdf_hash || "No generado"),
      signedPdfHash: escapeHtml(doc.signed_pdf_hash || "No generado"),
      tokenReference: escapeHtml(link?.token || "—"),
      signatureMethod: escapeHtml((sigEvents && sigEvents.length > 0 ? sigEvents[sigEvents.length - 1].signature_method : null) || "PAdES"),
      ipAddress,
      userAgent: escapeHtml(userAgent.substring(0, 200)),
      otpMethod: escapeHtml(verification?.verification_method || "—"),
      otpResult: escapeHtml(verification?.status || "—"),
      otpVerifiedAt: formatDatePY(verification?.verified_at || verification?.created_at || null),
      consentVersion: escapeHtml(consent?.consent_version || "v1.0"),
      consentAccepted: consent ? "Sí" : "—",
      consentCreatedAt: formatDatePY(consent?.created_at || null),
      eventsRows,
    };

    const renderedHtml = renderTemplate(CERTIFICATE_HTML, templateData);

    // 9. Send to render service
    const renderUrl = Deno.env.get("RENDER_URL");
    const renderKey = Deno.env.get("RENDER_KEY");
    if (!renderUrl || !renderKey) {
      return new Response(JSON.stringify({ error: "RENDER_URL or RENDER_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const renderResponse = await fetch(renderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RENDER-KEY": renderKey },
      body: JSON.stringify({ html: renderedHtml, options: { format: "A4", printBackground: true } }),
    });

    if (!renderResponse.ok) {
      const errText = await renderResponse.text();
      console.error("Render service error:", errText);
      return new Response(JSON.stringify({ error: "Render service failed", details: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = new Uint8Array(await renderResponse.arrayBuffer());
    const hash = await sha256Hex(pdfBytes);

    // 10. Upload to Storage
    const bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
    const storagePath = `contracts/evidence/${doc.sale_id}/${doc.id}.pdf`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Storage upload failed", details: uploadErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const certificateUrl = `${bucket}:${storagePath}`;

    // 11. Update documents table
    await supabaseAdmin
      .from("documents")
      .update({ evidence_certificate_url: certificateUrl, evidence_certificate_hash: hash })
      .eq("id", document_id);

    // 12. Insert into legal_evidence_certificates
    await supabaseAdmin
      .from("legal_evidence_certificates")
      .insert({
        sale_id: doc.sale_id,
        document_id: doc.id,
        signature_link_id: signature_link_id || null,
        certificate_url: certificateUrl,
        certificate_hash: hash,
        payload: templateData,
      });

    return new Response(
      JSON.stringify({ success: true, document_id, certificate_url: certificateUrl, certificate_hash: hash }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-evidence-certificate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
