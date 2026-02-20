import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIGNWELL_API_BASE = "https://www.signwell.com/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's company
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get SignWell API key from company_settings
    const { data: settings } = await serviceClient
      .from("company_settings")
      .select("signwell_api_key, signwell_enabled")
      .eq("company_id", profile.company_id)
      .single();

    if (!settings?.signwell_enabled || !settings?.signwell_api_key) {
      return new Response(
        JSON.stringify({ error: "SignWell no está habilitado o falta la API key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = settings.signwell_api_key;
    const body = await req.json();
    const { action } = body;

    // Route actions
    switch (action) {
      case "test_connection": {
        const res = await fetch(`${SIGNWELL_API_BASE}/me`, {
          headers: { "X-Api-Key": apiKey },
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(
            JSON.stringify({ success: false, error: data.error || "Conexión fallida" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_document": {
        const { name, file_base64, file_url, recipients } = body;

        const docPayload: Record<string, unknown> = {
          name: name || "Documento SAMAP",
          draft: false,
          reminders: true,
          apply_signing_order: false,
          embedded_signing: true,
          recipients: recipients.map((r: { name: string; email: string }) => ({
            id: crypto.randomUUID(),
            name: r.name,
            email: r.email,
            send_email: false, // We handle notifications via WhatsApp
          })),
        };

        // Attach file
        if (file_base64) {
          docPayload.files = [{ name: `${name || "documento"}.pdf`, file_base64 }];
        } else if (file_url) {
          docPayload.files = [{ name: `${name || "documento"}.pdf`, file_url }];
        }

        const res = await fetch(`${SIGNWELL_API_BASE}/documents`, {
          method: "POST",
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(docPayload),
        });

        const data = await res.json();
        if (!res.ok) {
          return new Response(
            JSON.stringify({ success: false, error: data.error || data.message || "Error al crear documento" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract signing URL from first recipient
        const signingUrl = data.recipients?.[0]?.embedded_signing_url || null;

        return new Response(
          JSON.stringify({
            success: true,
            document_id: data.id,
            signing_url: signingUrl,
            recipients: data.recipients,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_status": {
        const { document_id } = body;
        if (!document_id) {
          return new Response(
            JSON.stringify({ error: "document_id requerido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const res = await fetch(`${SIGNWELL_API_BASE}/documents/${document_id}`, {
          headers: { "X-Api-Key": apiKey },
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(
            JSON.stringify({ success: false, error: data.error || "Error al obtener estado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_completed_pdf": {
        const { document_id: docId } = body;
        if (!docId) {
          return new Response(
            JSON.stringify({ error: "document_id requerido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const res = await fetch(`${SIGNWELL_API_BASE}/documents/${docId}/completed_pdf`, {
          headers: { "X-Api-Key": apiKey },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          return new Response(
            JSON.stringify({ success: false, error: (errorData as { error?: string }).error || "PDF no disponible" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await res.json();
        return new Response(
          JSON.stringify({ success: true, pdf_url: data.pdf_url || data.url }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Acción desconocida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("signwell-proxy error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
