/**
 * Simple in-memory sliding-window rate limiter for Edge Functions.
 *
 * Notes / limitations:
 * - State lives in the isolate's memory. Each edge instance keeps its own map.
 *   With Supabase Edge Functions instances are pooled aggressively, so a single
 *   abusive caller will still be effectively throttled per region even without
 *   a shared backend (Redis, Upstash, etc.).
 * - This is an *ad-hoc* protection layer. For strict guarantees back it with a
 *   central store — this project intentionally opts for the lightweight path.
 */

type Window = { count: number; resetAt: number };
const buckets = new Map<string, Window>();

export interface RateLimitOptions {
  /** Requests allowed inside the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Bucket key — usually a user id or IP. */
  key: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${opts.key}:${opts.windowMs}:${opts.limit}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const fresh: Window = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(bucketKey, fresh);
    return { ok: true, remaining: opts.limit - 1, resetAt: fresh.resetAt, retryAfterSeconds: 0 };
  }

  if (existing.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/** Build a 429 Response with the standard Retry-After header. */
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Try again shortly.", retry_after: result.retryAfterSeconds }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    },
  );
}

/** Fallback identifier when no auth user is available. */
export function clientIpFrom(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}