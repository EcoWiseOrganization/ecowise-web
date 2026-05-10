import { NextResponse } from "next/server";
import { confirmMockPaymentAction } from "@/app/actions/subscription.actions";

interface Ctx {
  params: Promise<{ intentId: string }>;
}

/**
 * Mock payment provider webhook stand-in. The checkout page calls this from
 * the browser via a "Confirm payment" button — in production, a real gateway
 * would post here from its own infrastructure. Auth is enforced inside the
 * server action via requireSession.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const { intentId } = await params;
  const res = await confirmMockPaymentAction(intentId);
  if (res.error) {
    const status =
      res.error === "AUTH_REQUIRED"
        ? 401
        : res.error === "INTENT_NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
