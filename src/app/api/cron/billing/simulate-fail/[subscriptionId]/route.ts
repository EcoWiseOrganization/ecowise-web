import { NextResponse } from "next/server";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { simulateFailedRenewal } from "@/services/subscription-lifecycle.service";

interface Ctx {
  params: Promise<{ subscriptionId: string }>;
}

/**
 * Admin-only helper to exercise the BR-10 retry path. Each call increments
 * retry_count by 1 and inserts a PendingPayment renewal invoice. Once the
 * subscription crosses the retry threshold the lifecycle service force-
 * terminates it.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    await requireSystemAdmin();
    const { subscriptionId } = await params;
    const result = await simulateFailedRenewal(subscriptionId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "FAILED" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      newRetryCount: result.newRetryCount,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.httpStatus });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
