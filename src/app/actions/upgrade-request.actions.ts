"use server";

/**
 * Manual plan-upgrade server actions.
 *   • requestPlanUpgradeAction — user / Org Admin files a bank-transfer
 *     upgrade request after scanning the QR.
 *   • Admin queue: list / approve / reject (System Admin only).
 */

import { revalidatePath } from "next/cache";
import {
  AuthError,
  requireOrgRole,
  requireSession,
  requireSystemAdmin,
} from "@/lib/auth/roles";
import { writeAuditLog } from "@/services/audit.service";
import {
  approveUpgradeRequest,
  createUpgradeRequest,
  listUpgradeRequests,
  rejectUpgradeRequest,
} from "@/services/upgrade-request.service";
import type {
  PlanUpgradeRequest,
  PlanUpgradeRequestStatus,
  PlanUpgradeRequestWithDetails,
  SubscriptionSubjectType,
} from "@/types/subscription.types";

// Subject access mirrors subscription.actions.ensureSubjectAccess: Org Admin
// for Org subjects, self for User subjects.
async function ensureSubjectAccess(
  subjectType: SubscriptionSubjectType,
  subjectId: string
): Promise<{ userId: string }> {
  if (subjectType === "Org") {
    const ctx = await requireOrgRole(subjectId, { adminOnly: true });
    return { userId: ctx.userId };
  }
  const ctx = await requireSession();
  if (subjectId !== ctx.userId) {
    throw new AuthError("FORBIDDEN_SUBJECT", "Not your subscription.", 403);
  }
  return { userId: ctx.userId };
}

export async function requestPlanUpgradeAction(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  planId: string;
  transferNote?: string | null;
}): Promise<{ data: PlanUpgradeRequest | null; error: string | null }> {
  try {
    const { userId } = await ensureSubjectAccess(opts.subjectType, opts.subjectId);
    const data = await createUpgradeRequest({
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      planId: opts.planId,
      requestedBy: userId,
      transferNote: opts.transferNote ?? null,
    });
    await writeAuditLog({
      action: "request_plan_upgrade",
      resourceType: "plan_upgrade_request",
      resourceId: data.id,
      orgId: opts.subjectType === "Org" ? opts.subjectId : null,
      actorUserId: userId,
      newValue: { planId: opts.planId },
    });
    revalidatePath("/admin/subscriptions/upgrade-requests");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function listUpgradeRequestsAction(
  status?: PlanUpgradeRequestStatus
): Promise<{ data: PlanUpgradeRequestWithDetails[]; error: string | null }> {
  try {
    await requireSystemAdmin();
    const data = await listUpgradeRequests(status);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function approveUpgradeRequestAction(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    const req = await approveUpgradeRequest(id, ctx.userId);
    await writeAuditLog({
      action: "approve_plan_upgrade",
      resourceType: "plan_upgrade_request",
      resourceId: id,
      orgId: req.subject_type === "Org" ? req.subject_id : null,
      actorUserId: ctx.userId,
      newValue: {
        planId: req.plan_id,
        subscriptionId: req.resulting_subscription_id,
      },
    });
    revalidatePath("/admin/subscriptions/upgrade-requests");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function rejectUpgradeRequestAction(
  id: string,
  reason?: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    const req = await rejectUpgradeRequest(id, ctx.userId, reason);
    await writeAuditLog({
      action: "reject_plan_upgrade",
      resourceType: "plan_upgrade_request",
      resourceId: id,
      orgId: req.subject_type === "Org" ? req.subject_id : null,
      actorUserId: ctx.userId,
      newValue: { reason: reason ?? null },
    });
    revalidatePath("/admin/subscriptions/upgrade-requests");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
