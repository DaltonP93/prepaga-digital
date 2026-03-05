import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, kind } = await req.json();
    if (!document_id || !kind) {
      return new Response(JSON.stringify({ error: "document_id and kind ('base'|'signed') are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const column = kind === "signed" ? "signed_pdf_url" : "base_pdf_url";

    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select(`id, ${column}`)
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storedUrl = (doc as any)[column];
    if (!storedUrl) {
      return new Response(JSON.stringify({ error: `No ${kind} PDF available for this document` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse bucket:path format — extract bucket from storedUrl if present
    let bucket: string;
    let storagePath: string;

    if (storedUrl.includes(":")) {
      const colonIdx = storedUrl.indexOf(":");
      bucket = storedUrl.substring(0, colonIdx);
      storagePath = storedUrl.substring(colonIdx + 1);
    } else {
      bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
      storagePath = storedUrl;
    }

    const expiresIn = 3600; // 1 hour
    const { data: signedUrlData, error: urlErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (urlErr || !signedUrlData) {
      return new Response(JSON.stringify({ error: "Could not generate download URL", details: urlErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-document-download-url error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
