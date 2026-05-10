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
