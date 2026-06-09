"use server";

/**
 * Server actions for Org Admin operations (Phase 3).
 * All mutations use `requireOrgRole(orgId, { adminOnly: true })`.
 * Reads use `requireOrgRole(orgId)` (any active member).
 *
 * Audit log entries for entity mutations are written automatically by the
 * generic audit_table_change trigger installed in migration 004.
 */

import { revalidatePath } from "next/cache";
import { requireOrgRole, AuthError } from "@/lib/auth/roles";
import { MSG } from "@/lib/messages";
import {
  getOrgMetricsSummary,
  getEmployeeActivity,
  getInviteCapacity,
  updateOrganization,
  reviewEmissionLog,
  getPendingEmissionLogs,
  type ReviewDecision,
} from "@/services/org-admin.service";
import {
  updateMemberRole,
  setMemberStatus,
  removeMember,
} from "@/services/org-member.service";
import { awardPointsForVerifiedLog } from "@/services/gamification.service";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  EmployeeActivityRow,
  InviteCapacity,
  MemberRole,
  MemberStatus,
  Organization,
  OrgMetricsSummary,
  UpdateOrganizationInput,
} from "@/types/organization.types";

// ── Reads ─────────────────────────────────────────────────────────────────

export async function getOrgMetricsAction(
  orgId: string,
  year?: number
): Promise<{ data: OrgMetricsSummary | null; error: string | null }> {
  try {
    await requireOrgRole(orgId);
    const data = await getOrgMetricsSummary(orgId, year);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getEmployeeActivityAction(
  orgId: string
): Promise<{ data: EmployeeActivityRow[]; error: string | null }> {
  try {
    // Admin-only per BR-04 (managerial scope) — non-admin members would
    // otherwise see every coworker's email + log count via this action,
    // even though the overview page UI doesn't render that panel for them.
    await requireOrgRole(orgId, { adminOnly: true });
    const data = await getEmployeeActivity(orgId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getInviteCapacityAction(
  orgId: string
): Promise<{ data: InviteCapacity | null; error: string | null }> {
  try {
    await requireOrgRole(orgId);
    const data = await getInviteCapacity(orgId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getPendingEmissionLogsAction(orgId: string) {
  try {
    await requireOrgRole(orgId);
    const data = await getPendingEmissionLogs(orgId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Mutations (admin only) ────────────────────────────────────────────────

export async function updateOrgAction(
  orgId: string,
  input: UpdateOrganizationInput
): Promise<{ data: Organization | null; error: string | null }> {
  try {
    await requireOrgRole(orgId, { adminOnly: true });
    const data = await updateOrganization(orgId, input);
    revalidatePath(`/dashboard/organization/${orgId}/settings`);
    revalidatePath(`/dashboard/organization/${orgId}`);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function updateMemberRoleAction(
  orgId: string,
  memberId: string,
  newRole: MemberRole
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await requireOrgRole(orgId, { adminOnly: true });
    await updateMemberRole(orgId, memberId, newRole);
    revalidatePath(`/dashboard/organization/${orgId}/employees`);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    const code = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: code };
  }
}

export async function setMemberStatusAction(
  orgId: string,
  memberId: string,
  status: MemberStatus
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await requireOrgRole(orgId, { adminOnly: true });
    await setMemberStatus(orgId, memberId, status);
    revalidatePath(`/dashboard/organization/${orgId}/employees`);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    const code = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: code };
  }
}

export async function removeMemberAction(
  orgId: string,
  memberId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await requireOrgRole(orgId, { adminOnly: true });
    await removeMember(orgId, memberId);
    revalidatePath(`/dashboard/organization/${orgId}/employees`);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    const code = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: code };
  }
}

export async function reviewEmissionLogAction(
  orgId: string,
  logId: string,
  decision: ReviewDecision,
  reason?: string | null
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireOrgRole(orgId, { adminOnly: true });
    if (decision !== "Verified" && decision !== "Rejected") {
      return { ok: false, error: MSG.INVALID_FORMAT };
    }
    // reviewEmissionLog now enforces (logId, orgId) scoping itself and
    // returns a structured outcome so we can branch on "already
    // verified" / "locked" / "wrong org" without rewriting the log.
    const outcome = await reviewEmissionLog(
      logId,
      orgId,
      decision,
      ctx.userId,
      reason,
    );
    if (!outcome.ok) {
      switch (outcome.reason) {
        case "not_found":
        case "wrong_org":
          return { ok: false, error: "LOG_NOT_FOUND" };
        case "locked":
          return { ok: false, error: "LOG_LOCKED" };
      }
    }

    // Phase 9: award green points to the log owner on Verified — but only
    // on the *transition* into Verified. Without this guard, an admin
    // re-reviewing the same row would credit the user every click.
    if (decision === "Verified" && !outcome.alreadyVerified) {
      const db = createServiceClient();
      const { data: log } = await db
        .from("EmissionLogs")
        .select("created_by")
        .eq("id", logId)
        .eq("org_id", orgId)
        .maybeSingle();
      const owner = (log as { created_by: string | null } | null)?.created_by ?? null;
      if (owner) {
        await awardPointsForVerifiedLog({ userId: owner, emissionLogId: logId });
      }
    }

    revalidatePath(`/dashboard/organization/${orgId}/emission-logs/review`);
    revalidatePath(`/dashboard/organization/${orgId}/overview`);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
