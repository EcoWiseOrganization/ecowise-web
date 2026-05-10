import { NextResponse } from "next/server";
import { runLifecycleTick } from "@/services/subscription-lifecycle.service";

/**
 * Subscription lifecycle cron endpoint.
 * Trigger via:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        https://your-host/api/cron/billing
 * The secret is read from `CRON_SECRET` env var. If unset (e.g. local dev),
 * any caller is accepted.
 */
function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const outcome = url.searchParams.get("outcome");
  const renewalOutcome: "success" | "fail" | "random" | undefined =
    outcome === "fail" || outcome === "random" || outcome === "success"
      ? outcome
      : undefined;
  const report = await runLifecycleTick(
    renewalOutcome ? { renewalOutcome } : {}
  );
  return NextResponse.json({ ok: true, report });
}

// Vercel/Next cron also accepts GET — keep it allowed with same auth.
export async function GET(req: Request) {
  return POST(req);
}
