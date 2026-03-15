import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const { template_id, asset_id, selected_pages } = await req.json();

    if (!template_id || !asset_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template_id, asset_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Load asset with template info
    const { data: asset, error: assetErr } = await adminClient
      .from("template_assets")
      .select("*, templates!inner(company_id)")
      .eq("id", asset_id)
      .single();

    if (assetErr || !asset) {
      return new Response(
        JSON.stringify({ error: "Asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = (asset as any).templates?.company_id;

    // Verify user belongs to same company
    const { data: profile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (!profile || profile.company_id !== companyId) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For PDFs, verify status is ready
    if (asset.asset_type === "pdf" && asset.status !== "ready") {
      return new Response(
        JSON.stringify({ error: `Asset not ready. Current status: ${asset.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get max sort_order
    const { data: existingBlocks } = await adminClient
      .from("template_blocks")
      .select("sort_order")
      .eq("template_id", template_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const maxSort = existingBlocks && existingBlocks.length > 0 ? existingBlocks[0].sort_order : -1;

    let blockType: string;
    let content: Record<string, unknown>;

    if (asset.asset_type === "pdf") {
      // Load asset pages
      const { data: assetPages } = await adminClient
        .from("template_asset_pages")
        .select("*")
        .eq("asset_id", asset_id)
        .order("page_number", { ascending: true });

      const pages = assetPages || [];
      const selectedPageNumbers = selected_pages && selected_pages.length > 0
        ? selected_pages
        : pages.map((p: any) => p.page_number);

      // Build page_previews from DB rows (storage paths, not signed URLs)
      const pagePreviews = pages
        .filter((p: any) => selectedPageNumbers.includes(p.page_number))
        .map((p: any) => ({
          page_number: p.page_number,
          preview_image_url: p.preview_image_url || "",
          width: p.width || 595,
          height: p.height || 842,
        }));

      blockType = "pdf_embed";
      content = {
        kind: "pdf_embed",
        asset_id,
        source_type: "pdf",
        display_mode: "embedded_pages",
        page_selection: {
          mode: selected_pages && selected_pages.length > 0 ? "specific" : "all",
          pages: selectedPageNumbers,
        },
        render_mode: "preview_image",
        final_output_mode: "merge_original_pdf_pages",
        page_previews: pagePreviews,
        allow_overlay_fields: true,
        replaceable: true,
      };
    } else if (asset.asset_type === "image") {
      // Generate a signed URL for the image
      const { data: signedData } = await adminClient.storage
        .from("documents")
        .createSignedUrl(asset.file_url, 3600);

      blockType = "image";
      content = {
        kind: "image",
        asset_id,
        src: signedData?.signedUrl || "",
        alt: asset.file_name,
        caption: "",
        fit: "contain",
        is_background: false,
      };
    } else {
      blockType = "attachment_card";
      content = {
        kind: "attachment_card",
        asset_id,
        title: asset.file_name,
        description: "",
        display_mode: "card",
        show_file_icon: true,
        show_meta: true,
        include_in_final_pdf: true,
        requires_acknowledgement: false,
        file_ref: {
          mime_type: asset.mime_type || "",
          page_count: asset.page_count || 0,
        },
      };
    }

    // Insert block
    const { data: block, error: blockErr } = await adminClient
      .from("template_blocks")
      .insert({
        template_id,
        block_type: blockType,
        page: 1,
        x: 0,
        y: 0,
        w: 100,
        h: 0,
        z_index: 0,
        rotation: 0,
        is_locked: false,
        is_visible: true,
        content,
        style: {},
        visibility_rules: {
          roles: ["titular", "adherente", "contratada"],
          conditions: [],
        },
        sort_order: maxSort + 1,
      })
      .select()
      .single();

    if (blockErr) {
      console.error("Block insert error:", blockErr);
      return new Response(
        JSON.stringify({ error: `Failed to create block: ${blockErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ block }), {
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
