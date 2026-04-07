import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_ACTIONS = [
  "get_sessions",
  "get_session",
  "create_session",
  "start_session",
  "stop_session",
  "logout_session",
  "get_qr",
  "get_me",
  "get_messages",
] as const;

type Action = (typeof VALID_ACTIONS)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Get company_id from profile
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get WAHA credentials from company_settings
    const { data: settings } = await adminClient
      .from("company_settings")
      .select("whatsapp_gateway_url, whatsapp_api_key")
      .eq("company_id", profile.company_id)
      .single();

    const wahaUrl = settings?.whatsapp_gateway_url;
    const wahaApiKey = settings?.whatsapp_api_key;

    if (!wahaUrl) {
      return new Response(
        JSON.stringify({ error: "WAHA URL not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const action = body.action as Action;
    const sessionName = body.session_name || "default";

    if (!VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build WAHA request
    const baseUrl = wahaUrl.replace(/\/+$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (wahaApiKey) {
      headers["X-Api-Key"] = wahaApiKey;
    }

    let wahaPath: string;
    let method = "GET";
    let fetchBody: string | undefined;

    switch (action) {
      case "get_sessions":
        wahaPath = "/api/sessions";
        break;
      case "get_session":
        wahaPath = `/api/sessions/${encodeURIComponent(sessionName)}`;
        break;
      case "create_session":
        wahaPath = "/api/sessions";
        method = "POST";
        fetchBody = JSON.stringify({
          name: sessionName,
          start: true,
          config: {
            proxy: null,
            webhooks: [],
          },
        });
        break;
      case "start_session":
        wahaPath = `/api/sessions/${encodeURIComponent(sessionName)}/start`;
        method = "POST";
        fetchBody = JSON.stringify({});
        break;
      case "stop_session":
        wahaPath = `/api/sessions/${encodeURIComponent(sessionName)}/stop`;
        method = "POST";
        fetchBody = JSON.stringify({});
        break;
      case "logout_session":
        wahaPath = `/api/sessions/${encodeURIComponent(sessionName)}/logout`;
        method = "POST";
        fetchBody = JSON.stringify({});
        break;
      case "get_qr":
        wahaPath = `/api/${encodeURIComponent(sessionName)}/auth/qr`;
        break;
      case "get_me":
        wahaPath = `/api/sessions/${encodeURIComponent(sessionName)}/me`;
        break;
      case "get_messages":
        wahaPath = `/api/messages?session=${encodeURIComponent(sessionName)}&limit=20`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const wahaResponse = await fetch(`${baseUrl}${wahaPath}`, {
      method,
      headers,
      body: fetchBody,
    });

    // For QR, check content type — may be image
    const contentType = wahaResponse.headers.get("content-type") || "";

    if (contentType.includes("image")) {
      const imageBuffer = await wahaResponse.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(imageBuffer))
      );
      return new Response(
        JSON.stringify({
          qr_image: `data:${contentType};base64,${base64}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const responseText = await wahaResponse.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return new Response(JSON.stringify(responseData), {
      status: wahaResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("waha-proxy error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
