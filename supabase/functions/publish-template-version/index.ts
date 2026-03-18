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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { template_id, version_id } = await req.json();

    if (!template_id || !version_id) {
      return new Response(
        JSON.stringify({ error: "template_id and version_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Unpublish all versions for this template
    const { error: unpubErr } = await supabase
      .from("template_versions")
      .update({ is_published: false })
      .eq("template_id", template_id);

    if (unpubErr) throw unpubErr;

    // 2. Publish the target version
    const { data: version, error: pubErr } = await supabase
      .from("template_versions")
      .update({ is_published: true })
      .eq("id", version_id)
      .eq("template_id", template_id)
      .select()
      .single();

    if (pubErr) throw pubErr;

    // 3. Update templates.published_version_id
    const { error: tplErr } = await supabase
      .from("templates")
      .update({ published_version_id: version_id })
      .eq("id", template_id);

    if (tplErr) throw tplErr;

    return new Response(
      JSON.stringify({
        success: true,
        published_version: version,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("publish-template-version error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
