import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

function verifyTwilioSignature(authToken: string, signature: string, url: string, params: Record<string, string>): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  const computed = createHmac("sha1", authToken).update(data).digest("base64");
  return timingSafeEqual(signature, computed);
}

function verifyMetaSignature(appSecret: string, signature: string, rawBody: string): boolean {
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return timingSafeEqual(signature, expected);
}

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
      // Validate Twilio HMAC signature
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioSignature = req.headers.get("x-twilio-signature") || "";

      const rawBody = await req.text();
      const form = new URLSearchParams(rawBody);
      const params: Record<string, string> = {};
      for (const [key, value] of form.entries()) {
        params[key] = value;
      }

      if (twilioAuthToken && twilioSignature) {
        const requestUrl = req.url;
        if (!verifyTwilioSignature(twilioAuthToken, twilioSignature, requestUrl, params)) {
          console.warn("Twilio signature verification failed");
          return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (twilioAuthToken) {
        // Token configured but no signature header — reject
        console.warn("Missing x-twilio-signature header");
        return new Response(JSON.stringify({ success: false, error: "Missing signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If no twilioAuthToken configured, allow through (graceful degradation)

      const sid = params["MessageSid"] || "";
      const providerStatus = params["MessageStatus"] || "";
      const errorCode = params["ErrorCode"] || "";
      const errorMessage = params["ErrorMessage"] || "";
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

    // Meta webhook payload — validate HMAC
    const metaAppSecret = Deno.env.get("META_APP_SECRET");
    const metaSignatureHeader = req.headers.get("x-hub-signature-256") || "";
    const rawBody = await req.text();

    if (metaAppSecret && metaSignatureHeader) {
      const sig = metaSignatureHeader.replace("sha256=", "");
      if (!verifyMetaSignature(metaAppSecret, sig, rawBody)) {
        console.warn("Meta webhook signature verification failed");
        return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (metaAppSecret) {
      console.warn("Missing x-hub-signature-256 header");
      return new Response(JSON.stringify({ success: false, error: "Missing signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
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
