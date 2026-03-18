import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { template_id, file_name, mime_type, file_base64 } = await req.json();

    if (!template_id || !file_name || !mime_type || !file_base64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template_id, file_name, mime_type, file_base64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate MIME
    if (mime_type.includes("word") || mime_type.includes("docx")) {
      return new Response(
        JSON.stringify({ error: "DOCX no soportado en esta subfase. Próximamente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!ALLOWED_MIMES.includes(mime_type)) {
      return new Response(
        JSON.stringify({ error: `MIME type not allowed: ${mime_type}. Allowed: ${ALLOWED_MIMES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for storage + DB
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify template exists and get company_id
    const { data: template, error: tplErr } = await adminClient
      .from("templates")
      .select("id, company_id")
      .eq("id", template_id)
      .single();

    if (tplErr || !template) {
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user belongs to same company
    const { data: profile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (!profile || profile.company_id !== template.company_id) {
      return new Response(
        JSON.stringify({ error: "Access denied: user does not belong to template company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = template.company_id;
    const assetId = crypto.randomUUID();
    const ext = MIME_EXT[mime_type] || "bin";
    const storagePath = `${companyId}/template-assets/${assetId}/original.${ext}`;

    // Decode base64 and upload
    const binaryStr = atob(file_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadErr } = await adminClient.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: mime_type, upsert: false });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine asset_type
    const assetType = mime_type === "application/pdf" ? "pdf" : "image";

    // Insert template_assets row
    const { data: asset, error: insertErr } = await adminClient
      .from("template_assets")
      .insert({
        id: assetId,
        template_id,
        asset_type: assetType,
        file_name,
        file_url: storagePath,
        mime_type,
        file_size: bytes.length,
        page_count: null,
        metadata: {},
        status: "uploaded",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ asset, company_id: companyId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
