import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const mapProviderStatus = (status?: string): string => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "read") return "read";
  if (normalized === "delivered") return "delivered";
  if (normalized === "sent" || normalized === "accepted" || normalized === "queued") return "sent";
  if (normalized === "failed" || normalized === "undelivered" || normalized === "error") return "failed";
  return "sent";
};

const getNowIso = () => new Date().toISOString();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ success: false, error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

      if (mode === "subscribe" && token && verifyToken && token === verifyToken && challenge) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: false, error: "Webhook verification failed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";

    // Twilio webhook payload
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      const sid = String(form.get("MessageSid") || "");
      const providerStatus = String(form.get("MessageStatus") || "");
      const errorCode = String(form.get("ErrorCode") || "");
      const errorMessage = String(form.get("ErrorMessage") || "");
      const mappedStatus = mapProviderStatus(providerStatus);

      if (!sid) {
        return new Response(JSON.stringify({ success: false, error: "Missing MessageSid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, string> = {
        status: mappedStatus,
      };

      if (mappedStatus === "delivered") updateData.delivered_at = getNowIso();
      if (mappedStatus === "read") updateData.read_at = getNowIso();
      if (mappedStatus === "failed") {
        updateData.error_message = errorMessage || (errorCode ? `Twilio error ${errorCode}` : "Twilio delivery failed");
      }

      const { error } = await supabase
        .from("whatsapp_messages")
        .update(updateData)
        .eq("whatsapp_message_id", sid);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, provider: "twilio", messageId: sid, status: mappedStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Meta webhook payload
    const body = await req.json();
    const statuses = body?.entry?.flatMap((entry: any) =>
      entry?.changes?.flatMap((change: any) => change?.value?.statuses || [])
    ) || [];

    if (!Array.isArray(statuses) || statuses.length === 0) {
      return new Response(JSON.stringify({ success: true, provider: "meta", processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const statusPayload of statuses) {
      const messageId = statusPayload?.id;
      const providerStatus = statusPayload?.status;
      if (!messageId) continue;

      const mappedStatus = mapProviderStatus(providerStatus);
      const updateData: Record<string, string> = {
        status: mappedStatus,
      };

      if (mappedStatus === "delivered") updateData.delivered_at = getNowIso();
      if (mappedStatus === "read") updateData.read_at = getNowIso();
      if (mappedStatus === "failed") {
        const errorDetail = statusPayload?.errors?.[0];
        updateData.error_message = errorDetail?.title || errorDetail?.message || "Meta delivery failed";
      }

      const { error } = await supabase
        .from("whatsapp_messages")
        .update(updateData)
        .eq("whatsapp_message_id", messageId);

      if (!error) processed += 1;
    }

    return new Response(JSON.stringify({ success: true, provider: "meta", processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
