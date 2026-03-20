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
      .select("id, sale_id, base_pdf_url, name")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!doc.base_pdf_url) {
      return new Response(JSON.stringify({ error: "No base PDF exists. Run generate-base-pdf first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Download base PDF from Storage
    const bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
    // base_pdf_url format: "documents:contracts/base/{saleId}/{docId}.pdf"
    const storagePath = doc.base_pdf_url.includes(":") ? doc.base_pdf_url.split(":").slice(1).join(":") : doc.base_pdf_url;

    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from(bucket)
      .download(storagePath);

    if (dlErr || !fileData) {
      return new Response(JSON.stringify({ error: "Could not download base PDF", details: dlErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Send to PAdES service
    const padesUrl = Deno.env.get("PADES_URL");
    const padesKey = Deno.env.get("PADES_KEY");
    if (!padesUrl || !padesKey) {
      return new Response(JSON.stringify({ error: "PADES_URL or PADES_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = new FormData();
    formData.append("file", fileData, `${doc.id}.pdf`);

    const padesResponse = await fetch(padesUrl, {
      method: "POST",
      headers: {
        "X-SIGN-KEY": padesKey,
      },
      body: formData,
    });

    if (!padesResponse.ok) {
      const errText = await padesResponse.text();
      console.error("PAdES service error:", errText);
      return new Response(JSON.stringify({ error: "PAdES signing failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signedPdfBytes = new Uint8Array(await padesResponse.arrayBuffer());

    // 4. Calculate SHA-256
    const signedHash = await sha256Hex(signedPdfBytes);

    // 5. Upload signed PDF
    const signedPath = `contracts/signed/${doc.sale_id}/${doc.id}.pdf`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(signedPath, signedPdfBytes, {
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

    // 6. Update document
    const signedPdfUrl = `${bucket}:${signedPath}`;
    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from("documents")
      .update({
        signed_pdf_url: signedPdfUrl,
        signed_pdf_hash: signedHash,
        status: "firmado",
        is_final: true,
        signed_at: nowIso,
      })
      .eq("id", document_id);

    if (updateErr) {
      console.error("Document update error:", updateErr);
    }

    // 7. Insert signature event
    await supabaseAdmin.from("signature_events").insert({
      sale_id: doc.sale_id,
      document_id: doc.id,
      document_hash: signedHash,
      signature_method: "pades",
      signed_pdf_hash: signedHash,
      timestamp: nowIso,
    });

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        signed_pdf_url: signedPdfUrl,
        signed_pdf_hash: signedHash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("pades-sign-document error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
