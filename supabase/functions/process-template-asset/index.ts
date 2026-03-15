import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

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

    const { asset_id } = await req.json();
    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: asset_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Load asset
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

    // For images: mark ready immediately, no page processing
    if (asset.asset_type !== "pdf") {
      if (asset.mime_type?.includes("word") || asset.mime_type?.includes("docx")) {
        return new Response(
          JSON.stringify({ error: "DOCX no soportado en esta subfase. Próximamente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("template_assets")
        .update({ status: "ready", page_count: 1, processing_error: null })
        .eq("id", asset_id);

      const { data: updatedAsset } = await adminClient
        .from("template_assets")
        .select("*")
        .eq("id", asset_id)
        .single();

      return new Response(JSON.stringify({ asset: updatedAsset }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PDF processing
    // Mark processing
    await adminClient
      .from("template_assets")
      .update({ status: "processing", processing_error: null })
      .eq("id", asset_id);

    try {
      // Idempotent: clean up previous pages and preview files before re-inserting
      const { data: oldPages } = await adminClient
        .from("template_asset_pages")
        .select("id, preview_image_url")
        .eq("asset_id", asset_id);

      if (oldPages && oldPages.length > 0) {
        // Delete old preview PNGs from storage
        const previewPaths = oldPages
          .map((p: any) => p.preview_image_url)
          .filter((url: string | null) => url && url.length > 0);

        if (previewPaths.length > 0) {
          await adminClient.storage.from("documents").remove(previewPaths);
        }

        // Delete old page rows
        await adminClient
          .from("template_asset_pages")
          .delete()
          .eq("asset_id", asset_id);
      }
      // Download PDF from storage
      const { data: fileData, error: dlErr } = await adminClient.storage
        .from("documents")
        .download(asset.file_url);

      if (dlErr || !fileData) {
        throw new Error(`Failed to download PDF: ${dlErr?.message || "no data"}`);
      }

      const pdfBytes = await fileData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      // Insert template_asset_pages with dimensions from pdf-lib
      const pageInserts = [];
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        pageInserts.push({
          asset_id,
          page_number: i + 1,
          preview_image_url: null, // Will be filled by frontend thumbnail upload
          width: Math.round(width),
          height: Math.round(height),
        });
      }

      if (pageInserts.length > 0) {
        const { error: pagesErr } = await adminClient
          .from("template_asset_pages")
          .insert(pageInserts);

        if (pagesErr) {
          throw new Error(`Failed to insert asset pages: ${pagesErr.message}`);
        }
      }

      // Update asset as ready
      await adminClient
        .from("template_assets")
        .update({ status: "ready", page_count: pageCount, processing_error: null })
        .eq("id", asset_id);

      const { data: updatedAsset } = await adminClient
        .from("template_assets")
        .select("*")
        .eq("id", asset_id)
        .single();

      // Load pages for response
      const { data: assetPages } = await adminClient
        .from("template_asset_pages")
        .select("*")
        .eq("asset_id", asset_id)
        .order("page_number", { ascending: true });

      return new Response(
        JSON.stringify({ asset: updatedAsset, pages: assetPages || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processErr: any) {
      console.error("PDF processing error:", processErr);

      await adminClient
        .from("template_assets")
        .update({ status: "failed", processing_error: processErr.message || "Unknown error" })
        .eq("id", asset_id);

      return new Response(
        JSON.stringify({ error: `Processing failed: ${processErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
