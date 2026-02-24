/**
 * Simple in-memory rate limiter for edge functions.
 * Uses a sliding window approach per identifier (IP or user ID).
 * Note: In-memory state resets on cold starts, which is acceptable
 * as it provides best-effort protection without external dependencies.
 */

const requestCounts = new Map<string, { count: number; windowStart: number }>();

interface RateLimitOptions {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

export function checkRateLimit(
  identifier: string,
  options: Partial<RateLimitOptions> = {}
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  // Clean up old entries periodically
  if (requestCounts.size > 10000) {
    for (const [key, val] of requestCounts.entries()) {
      if (now - val.windowStart > opts.windowMs) {
        requestCounts.delete(key);
      }
    }
  }

  if (!entry || now - entry.windowStart > opts.windowMs) {
    requestCounts.set(identifier, { count: 1, windowStart: now });
    return { allowed: true, remaining: opts.maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > opts.maxRequests) {
    const retryAfterMs = opts.windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: opts.maxRequests - entry.count };
}

export function rateLimitResponse(corsHeaders: Record<string, string>, retryAfterMs?: number) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...(retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : {}),
      },
    }
  );
}

export function getClientIdentifier(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
