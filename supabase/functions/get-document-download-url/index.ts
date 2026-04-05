import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, kind } = await req.json();
    if (!document_id || !kind) {
      return new Response(JSON.stringify({ error: "document_id and kind ('base'|'signed'|'evidence'|'file') are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Authentication: support JWT user OR public signature token ---
    const authHeader = req.headers.get("Authorization") || "";
    const signatureToken = req.headers.get("x-signature-token") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    let authorized = false;

    // 1) Try authenticated user JWT (not the anon key itself)
    if (bearerToken && bearerToken !== supabaseAnonKey) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      });
      const { data, error } = await userClient.auth.getUser(bearerToken);
      if (!error && data?.user) {
        authorized = true;
      }
    }

    // 2) Try public signature token — validate it maps to a sale that owns this document
    if (!authorized && signatureToken) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: link } = await supabaseAdmin
        .from("signature_links")
        .select("sale_id")
        .eq("token", signatureToken)
        .gt("expires_at", new Date().toISOString())
        .neq("status", "revocado")
        .single();

      if (link) {
        // Verify the document belongs to this sale
        const { data: doc } = await supabaseAdmin
          .from("documents")
          .select("id")
          .eq("id", document_id)
          .eq("sale_id", link.sale_id)
          .single();
        if (doc) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Authorized: generate signed URL ---
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const columnMap: Record<string, string> = {
      signed: "signed_pdf_url",
      base: "base_pdf_url",
      evidence: "evidence_certificate_url",
      file: "file_url",
    };
    const column = columnMap[kind] || "base_pdf_url";

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
      return new Response(JSON.stringify({ error: `No ${kind} file available for this document` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const expiresIn = 3600;
    const { data: signedUrlData, error: urlErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (urlErr || !signedUrlData) {
      console.error("createSignedUrl error:", urlErr, "bucket:", bucket, "path:", storagePath);
      return new Response(JSON.stringify({ error: "Could not generate download URL" }), {
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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
