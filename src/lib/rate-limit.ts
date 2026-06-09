/**
 * Server-side rate limiter (Phase 2).
 *
 * Stores submission timestamps per key (typically IP) in `"ContactRateLimits"`
 * — DB-backed so it works across serverless instances. Uses a sliding window
 * with a configurable max count.
 *
 * Pure helper variants are exported separately so they can be unit-tested
 * without a database.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface RateLimitConfig {
  /** Window in seconds. */
  windowSec: number;
  /** Max submissions allowed per key inside the window. */
  max: number;
}

/**
 * Pure helper used by both the DB-backed limiter and tests. Returns `true`
 * when the new submission would exceed the limit and should be rejected.
 */
export function exceedsLimit(
  existingTimestamps: Date[],
  now: Date,
  config: RateLimitConfig
): boolean {
  const cutoffMs = now.getTime() - config.windowSec * 1000;
  const recent = existingTimestamps.filter((d) => d.getTime() >= cutoffMs);
  return recent.length >= config.max;
}

/**
 * DB-backed rate limit + record. Returns:
 *   • `{ ok: true }` when the request is allowed (and writes a row).
 *   • `{ ok: false, retryAfterSec }` when the limit has been hit.
 */
export async function consumeContactRateLimit(
  ip: string | null,
  config: RateLimitConfig = { windowSec: 15 * 60, max: 5 }
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const key = ip && ip.trim().length > 0 ? ip : "anonymous";
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - config.windowSec * 1000).toISOString();

  const { data: rows } = await db
    .from("ContactRateLimits")
    .select("created_at")
    .eq("ip_address", key)
    .gte("created_at", cutoff);

  const count = rows?.length ?? 0;
  if (count >= config.max) {
    // earliest row in window controls retry-after window
    const earliest = (rows ?? [])
      .map((r) => new Date((r as { created_at: string }).created_at).getTime())
      .sort((a, b) => a - b)[0];
    const retryAfterSec = earliest
      ? Math.max(1, Math.ceil((earliest + config.windowSec * 1000 - Date.now()) / 1000))
      : config.windowSec;
    return { ok: false, retryAfterSec };
  }

  await db.from("ContactRateLimits").insert({ ip_address: key });
  return { ok: true };
}

/**
 * Auth-surface limiter (login / send-otp / forgot-otp). Same algorithm
 * as contact, but keyed by an arbitrary "bucket" string so we can throttle
 * per-email and per-IP independently across endpoints.
 *
 * Returns:
 *   - `{ ok: true }` when allowed (and writes a row).
 *   - `{ ok: false, retryAfterSec }` when the limit has been hit.
 *
 * The bucket string is opaque to this helper; build it at the call site,
 * e.g. `consumeAuthRateLimit(`login:email:${email}`, { ... })`.
 */
export async function consumeAuthRateLimit(
  bucket: string,
  config: RateLimitConfig,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  if (!bucket || bucket.trim().length === 0) {
    // Don't throttle anonymous buckets — caller bug rather than abuse.
    return { ok: true };
  }
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - config.windowSec * 1000).toISOString();

  const { data: rows } = await db
    .from("AuthRateLimits")
    .select("created_at")
    .eq("bucket", bucket)
    .gte("created_at", cutoff);

  const count = rows?.length ?? 0;
  if (count >= config.max) {
    const earliest = (rows ?? [])
      .map((r) => new Date((r as { created_at: string }).created_at).getTime())
      .sort((a, b) => a - b)[0];
    const retryAfterSec = earliest
      ? Math.max(
          1,
          Math.ceil((earliest + config.windowSec * 1000 - Date.now()) / 1000),
        )
      : config.windowSec;
    return { ok: false, retryAfterSec };
  }

  await db.from("AuthRateLimits").insert({ bucket });
  return { ok: true };
}

/**
 * Resolve the caller IP from a Fetch `Request`. Falls back through the
 * common proxy headers; returns "unknown" when nothing identifies the
 * client (still throttled, just as a shared bucket). The IP is only used
 * for rate-limit bucketing — not stored anywhere user-visible.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}
