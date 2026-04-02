import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const targetCompanyId = body.company_id;

    // Get companies with WAHA/QR session configured
    let query = supabase
      .from("company_settings")
      .select("company_id, whatsapp_gateway_url, whatsapp_api_key, whatsapp_provider")
      .in("whatsapp_provider", ["waha", "qr_session"]);

    if (targetCompanyId) {
      query = query.eq("company_id", targetCompanyId);
    }

    const { data: companies, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching companies:", fetchError);
      return new Response(
        JSON.stringify({ error: "Error fetching company settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: "No companies with WAHA configured", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const company of companies) {
      const gatewayUrl = company.whatsapp_gateway_url;
      const apiKey = company.whatsapp_api_key;

      if (!gatewayUrl) {
        // Log as UNKNOWN if no gateway URL
        await supabase.from("waha_health_logs").insert({
          company_id: company.company_id,
          session_status: "UNKNOWN",
          error_message: "No gateway URL configured",
          checked_at: new Date().toISOString(),
        });
        results.push({ company_id: company.company_id, status: "UNKNOWN", error: "No gateway URL" });
        continue;
      }

      const startTime = Date.now();
      let sessionStatus = "UNKNOWN";
      let errorMessage: string | null = null;
      let responseTimeMs: number | null = null;

      try {
        const url = `${gatewayUrl.replace(/\/$/, "")}/api/sessions/default`;
        const headers: Record<string, string> = { "Accept": "application/json" };
        if (apiKey) {
          headers["X-Api-Key"] = apiKey;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeout);

        responseTimeMs = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          sessionStatus = data.status || data.engine?.state || "UNKNOWN";
        } else {
          const text = await response.text();
          sessionStatus = "FAILED";
          errorMessage = `HTTP ${response.status}: ${text.substring(0, 200)}`;
        }
      } catch (err) {
        responseTimeMs = Date.now() - startTime;
        sessionStatus = "FAILED";
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      // Insert health log
      await supabase.from("waha_health_logs").insert({
        company_id: company.company_id,
        session_status: sessionStatus,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
        checked_at: new Date().toISOString(),
      });

      // If not WORKING, send notification to admins
      if (sessionStatus !== "WORKING") {
        try {
          // Get admin users for this company
          const { data: admins } = await supabase
            .from("profiles")
            .select("id")
            .eq("company_id", company.company_id);

          if (admins) {
            for (const admin of admins) {
              // Check if admin has privileged role
              const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", admin.id)
                .in("role", ["super_admin", "admin"])
                .limit(1);

              if (roleData && roleData.length > 0) {
                await supabase.from("notifications").insert({
                  user_id: admin.id,
                  title: "⚠️ Sesión WAHA caída",
                  message: `La sesión de WhatsApp reporta estado: ${sessionStatus}. ${errorMessage || "Verifique la conexión."}`,
                  type: "warning",
                  link: "/configuracion",
                });
              }
            }
          }
        } catch (notifErr) {
          console.error("Error sending notifications:", notifErr);
        }
      }

      results.push({
        company_id: company.company_id,
        status: sessionStatus,
        response_time_ms: responseTimeMs,
        error: errorMessage,
      });
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
