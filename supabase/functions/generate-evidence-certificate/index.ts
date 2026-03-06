import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(data: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTemplate(html: string, data: Record<string, any>) {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const value = data[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("es-PY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

function tokenReference(token?: string | null) {
  if (!token) return "";
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function buildEvidenceCertificateHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Certificado de Evidencia Legal</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #d1d5db;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand img {
      max-height: 56px;
      max-width: 140px;
      object-fit: contain;
    }
    .brand-text h1 {
      margin: 0;
      font-size: 20px;
      color: #111827;
    }
    .brand-text p {
      margin: 4px 0 0 0;
      color: #4b5563;
      font-size: 11px;
    }
    .badge {
      font-size: 11px;
      font-weight: bold;
      color: #065f46;
      background: #d1fae5;
      border: 1px solid #a7f3d0;
      border-radius: 999px;
      padding: 6px 10px;
    }
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .section h2 {
      font-size: 14px;
      margin: 0 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
      color: #111827;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 18px;
    }
    .field { margin-bottom: 8px; }
    .label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .value {
      font-size: 12px;
      color: #111827;
      word-break: break-word;
    }
    .mono {
      font-family: "Courier New", monospace;
      font-size: 11px;
      word-break: break-all;
    }
    .summary-box {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px;
      vertical-align: top;
      text-align: left;
      word-break: break-word;
    }
    th {
      background: #f3f4f6;
      font-size: 11px;
      color: #111827;
    }
    td {
      font-size: 11px;
      color: #1f2937;
    }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
      font-size: 10px;
      color: #6b7280;
    }
    .small {
      font-size: 10px;
      color: #6b7280;
    }
    .mt-8 { margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {{companyLogoImg}}
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { document_id, signature_link_id } = await req.json();

    if (!document_id) {
      return json(400, { error: "document_id is required" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
    const renderUrl = Deno.env.get("RENDER_URL");
    const renderKey = Deno.env.get("RENDER_KEY");

    if (!renderUrl || !renderKey) {
      return json(500, { error: "RENDER_URL or RENDER_KEY not configured" });
    }

    // 1) Document
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select(`
        id,
        sale_id,
        name,
        document_type,
        base_pdf_hash,
        signed_pdf_hash,
        base_pdf_url,
        signed_pdf_url
      `)
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return json(404, { error: "Document not found", details: docErr?.message });
    }

    // 2) Sale
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select(`
        id,
        company_id,
        contract_number,
        signer_name,
        signer_dni,
        signer_type
      `)
      .eq("id", doc.sale_id)
      .single();

    if (saleErr || !sale) {
      return json(404, { error: "Sale not found", details: saleErr?.message });
    }

    // 3) Company
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, logo_url")
      .eq("id", sale.company_id)
      .single();

    // 4) Signature link
    let link: any = null;
    if (signature_link_id) {
      const { data } = await supabase
        .from("signature_links")
        .select(`
          id,
          token,
          recipient_type,
          recipient_id,
          recipient_email,
          recipient_phone,
          step_order,
          completed_at,
          expires_at
        `)
        .eq("id", signature_link_id)
        .single();
      link = data;
    } else {
      // fallback: last completed link for this sale
      const { data } = await supabase
        .from("signature_links")
        .select(`
          id,
          token,
          recipient_type,
          recipient_id,
          recipient_email,
          recipient_phone,
          step_order,
          completed_at,
          expires_at
        `)
        .eq("sale_id", doc.sale_id)
        .eq("status", "completado")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      link = data;
    }

    // 5) Signature event
    const { data: signEvent } = await supabase
      .from("signature_events")
      .select(`
        id,
        timestamp,
        ip_address,
        user_agent,
        signature_method,
        identity_verification_id,
        consent_record_id,
        signed_pdf_hash
      `)
      .eq("document_id", doc.id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6) OTP verification
    let otp: any = null;
    if (signEvent?.identity_verification_id) {
      const { data } = await supabase
        .from("signature_identity_verification")
        .select(`
          id,
          auth_method,
          result,
          verified_at,
          channel
        `)
        .eq("id", signEvent.identity_verification_id)
        .maybeSingle();
      otp = data;
    }

    // 7) Consent
    let consent: any = null;
    if (signEvent?.consent_record_id) {
      const { data } = await supabase
        .from("signature_consent_records")
        .select(`
          id,
          consent_text_version,
          checkbox_state,
          created_at
        `)
        .eq("id", signEvent.consent_record_id)
        .maybeSingle();
      consent = data;
    }

    // 8) Process traces / chronology
    const { data: traces } = await supabase
      .from("process_traces")
      .select("action, details, created_at")
      .eq("sale_id", doc.sale_id)
      .order("created_at", { ascending: true });

    const eventsRows = (traces || [])
      .map((t: any) => {
        const action = escapeHtml(t.action || "");
        const actor = escapeHtml(t.details?.recipient_type || t.details?.actor || "");
        const detail = escapeHtml(
          JSON.stringify(t.details || {})
            .replaceAll("{", "")
            .replaceAll("}", "")
        );
        return `<tr><td>${escapeHtml(formatDate(t.created_at))}</td><td>${action}</td><td>${actor}</td><td>${detail}</td></tr>`;
      })
      .join("");

    // 9) Resolve signer name
    let signerName = "";
    if (link?.recipient_type === "titular") {
      signerName = sale.signer_name || "Titular";
    } else if (link?.recipient_type === "contratada") {
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("contratada_signer_name, contratada_signer_email")
        .eq("company_id", sale.company_id)
        .maybeSingle();

      signerName =
        companySettings?.contratada_signer_name ||
        company?.name ||
        "Contratada";
    } else if (link?.recipient_type === "adherente" && link?.recipient_id) {
      const { data: beneficiary } = await supabase
        .from("beneficiaries")
        .select("first_name, last_name, email, phone")
        .eq("id", link.recipient_id)
        .maybeSingle();

      signerName = beneficiary
        ? `${beneficiary.first_name || ""} ${beneficiary.last_name || ""}`.trim()
        : "Adherente";
    }

    // 10) HTML data
    const companyLogoImg =
      company?.logo_url
        ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo" />`
        : "";

    const htmlData: Record<string, string> = {
      companyLogoImg,
      companyName: escapeHtml(company?.name || ""),
      documentName: escapeHtml(doc.name || ""),
      documentType: escapeHtml(doc.document_type || ""),
      contractNumber: escapeHtml(sale.contract_number || ""),
      certificateIssuedAt: escapeHtml(formatDate(new Date().toISOString())),
      saleId: escapeHtml(doc.sale_id),
      documentId: escapeHtml(doc.id),
      signerName: escapeHtml(signerName),
      recipientType: escapeHtml(link?.recipient_type || ""),
      signerEmail: escapeHtml(link?.recipient_email || ""),
      signerPhone: escapeHtml(link?.recipient_phone || ""),
      stepOrder: escapeHtml(String(link?.step_order ?? "")),
      signatureLinkId: escapeHtml(link?.id || ""),
      basePdfHash: escapeHtml(doc.base_pdf_hash || ""),
      signedPdfHash: escapeHtml(doc.signed_pdf_hash || signEvent?.signed_pdf_hash || ""),
      tokenReference: escapeHtml(tokenReference(link?.token)),
      signatureMethod: escapeHtml(signEvent?.signature_method || "PAdES"),
      ipAddress: escapeHtml(signEvent?.ip_address || ""),
      userAgent: escapeHtml(signEvent?.user_agent || ""),
      otpMethod: escapeHtml(otp?.auth_method || ""),
      otpResult: escapeHtml(otp?.result || ""),
      otpVerifiedAt: escapeHtml(formatDate(otp?.verified_at)),
      consentVersion: escapeHtml(consent?.consent_text_version || ""),
      consentAccepted: consent?.checkbox_state ? "Sí" : "No",
      consentCreatedAt: escapeHtml(formatDate(consent?.created_at)),
      eventsRows,
    };

    // 11) Render HTML
    const rawHtml = buildEvidenceCertificateHtml();
    const renderedHtml = renderTemplate(rawHtml, htmlData);

    const renderResponse = await fetch(renderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RENDER-KEY": renderKey,
      },
      body: JSON.stringify({
        html: renderedHtml,
        options: {
          format: "A4",
          printBackground: true,
          margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
        },
      }),
    });

    if (!renderResponse.ok) {
      const errText = await renderResponse.text();
      console.error("Render service error:", errText);
      return json(502, { error: "Render service failed", details: errText });
    }

    const pdfBytes = new Uint8Array(await renderResponse.arrayBuffer());
    const certHash = await sha256Hex(pdfBytes);

    // 12) Upload PDF
    const storagePath = `contracts/evidence/${doc.sale_id}/${doc.id}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return json(500, { error: "Storage upload failed", details: uploadErr.message });
    }

    const certUrl = `${bucket}:${storagePath}`;

    // 13) Update document
    const { error: docUpdateErr } = await supabase
      .from("documents")
      .update({
        evidence_certificate_url: certUrl,
        evidence_certificate_hash: certHash,
      })
      .eq("id", doc.id);

    if (docUpdateErr) {
      console.error("Document update error:", docUpdateErr);
      return json(500, { error: "Could not update document", details: docUpdateErr.message });
    }

    // 14) Insert legal_evidence_certificates
    const payload = {
      saleId: doc.sale_id,
      documentId: doc.id,
      signatureLinkId: link?.id || null,
      htmlData,
    };

    const { error: certErr } = await supabase
      .from("legal_evidence_certificates")
      .insert({
        sale_id: doc.sale_id,
        document_id: doc.id,
        signature_link_id: link?.id || null,
        certificate_url: certUrl,
        certificate_hash: certHash,
        payload,
      });

    if (certErr) {
      console.error("Legal evidence insert error:", certErr);
      return json(500, { error: "Could not insert legal evidence record", details: certErr.message });
    }

    return json(200, {
      ok: true,
      document_id: doc.id,
      evidence_certificate_url: certUrl,
      evidence_certificate_hash: certHash,
    });
  } catch (err) {
    console.error("generate-evidence-certificate error:", err);
    return json(500, { error: err?.message || "Unexpected error" });
  }
});
