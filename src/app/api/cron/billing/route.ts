import { NextResponse } from "next/server";
import { runLifecycleTick } from "@/services/subscription-lifecycle.service";
import { createServiceClient } from "@/lib/supabase/service";
import { timingSafeEqual } from "crypto";

/**
 * Subscription lifecycle cron endpoint.
 *
 * Trigger via:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-host/api/cron/billing
 *
 * Auth rules:
 *  - `CRON_SECRET` must be set in production; if not we fail closed (401) so
 *    a forgotten env var can't open this destructive endpoint to the world.
 *  - In non-production (dev/preview), a missing secret accepts any caller —
 *    convenient for local testing but logged once on startup.
 *  - Comparison uses `crypto.timingSafeEqual` to remove the timing oracle on
 *    the secret. Length-mismatch short-circuits before the constant-time
 *    compare so two equal-length wrong values cost the same as the right one.
 *  - The `outcome=fail|random` query param (used by the dev/sim tooling to
 *    force a failed renewal) is only honoured when an explicit
 *    `Authorization: Bearer <secret>` is present, *not* when the dev fallback
 *    is in effect. This keeps the sim controls behind the same gate even on
 *    dev hosts that happen to be exposed.
 */
function isAuthorized(req: Request): { ok: boolean; secretPresent: boolean } {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[cron/billing] CRON_SECRET is not set in production — rejecting request",
      );
      return { ok: false, secretPresent: false };
    }
    console.warn(
      "[cron/billing] CRON_SECRET is not set; accepting unauthenticated call in non-production",
    );
    return { ok: true, secretPresent: false };
  }

  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) {
    return { ok: false, secretPresent: true };
  }
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return { ok: timingSafeEqual(a, b), secretPresent: true };
}

export async function POST(req: Request) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Only callers with a real Bearer secret can force a failure outcome.
  // The dev-fallback path (no secret in non-prod) must not be able to flip
  // production-ish lifecycle behaviour from outside.
  const url = new URL(req.url);
  const outcome = url.searchParams.get("outcome");
  const renewalOutcome: "success" | "fail" | "random" | undefined =
    auth.secretPresent && (outcome === "fail" || outcome === "random" || outcome === "success")
      ? outcome
      : undefined;

  const report = await runLifecycleTick(
    renewalOutcome ? { renewalOutcome } : {},
  );

  // Sweep the rate-limit tables (migration 029) on every tick. They
  // accumulate one row per request and never had a cleanup path —
  // running the purge alongside the lifecycle work piggybacks on the
  // existing Vercel cron without spinning up another schedule. Errors
  // are logged but never fail the tick; the billing work is the load-
  // bearing part of this endpoint.
  let purgedRateLimits:
    | {
        contact_deleted: number;
        event_form_deleted: number;
        auth_deleted: number;
      }
    | null = null;
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("purge_expired_rate_limits", {
      p_window_hours: 24,
    });
    if (error) {
      console.warn("[cron/billing] purge_expired_rate_limits failed", error);
    } else if (Array.isArray(data) && data.length > 0) {
      purgedRateLimits = data[0] as typeof purgedRateLimits;
    }
  } catch (err) {
    console.warn("[cron/billing] purge_expired_rate_limits threw", err);
  }

  return NextResponse.json({ ok: true, report, purgedRateLimits });
}

// Vercel cron historically sent GET; modern cron uses POST. We keep GET only
// to accept the platform's scheduler, never to let a browser preview / link
// expander trigger destructive lifecycle work — auth is enforced identically.
export async function GET(req: Request) {
  return POST(req);
}
