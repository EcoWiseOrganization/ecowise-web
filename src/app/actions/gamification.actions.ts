"use server";

/**
 * Gamification server actions (Phase 9).
 *
 * Authority matrix (matches docs/plan §1.3):
 *   • Global Challenges/Rewards/Badges  — System Admin only
 *   • Org-scoped Challenges             — Org Admin only (Phase 9.5)
 *   • Join challenge / redeem reward    — Authenticated user (self)
 *   • Leaderboard                       — Authenticated user
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
  completeChallenge,
  deleteChallenge,
  deleteReward,
  earnPoints,
  getChallenge,
  getReward,
  joinChallenge,
  listChallenges,
  listMyChallenges,
  listMyRedemptions,
  listRewards,
  redeemReward,
  upsertChallenge,
  upsertReward,
  getLeaderboard,
  type LeaderboardWindow,
} from "@/services/gamification.service";
import type {
  Challenge,
  GreenPointLog,
  LeaderboardRow,
  Redemption,
  Reward,
  UpsertChallengeInput,
  UpsertRewardInput,
  UserChallenge,
} from "@/types/gamification.types";
import { createServiceClient } from "@/lib/supabase/service";

// ── Challenges (admin-side) ───────────────────────────────────────────────

async function ensureChallengeAuthority(orgId: string | null | undefined) {
  if (!orgId) {
    return await requireSystemAdmin();
  }
  return await requireOrgRole(orgId, { adminOnly: true });
}

export async function listChallengesAction(opts: {
  orgId?: string | null;
  includeGlobal?: boolean;
}): Promise<{ data: Challenge[]; error: string | null }> {
  try {
    await requireSession();
    const data = await listChallenges(opts);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function upsertChallengeAction(opts: {
  id?: string;
  input: UpsertChallengeInput;
}): Promise<{ data: Challenge | null; error: string | null }> {
  try {
    const ctx = await ensureChallengeAuthority(opts.input.org_id ?? null);
    const data = await upsertChallenge({
      id: opts.id,
      input: opts.input,
      userId: ctx.userId,
    });
    revalidatePath("/admin/challenges");
    if (opts.input.org_id) {
      revalidatePath(`/dashboard/organization/${opts.input.org_id}/challenges`);
    }
    revalidatePath("/dashboard/challenges");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function deleteChallengeAction(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const existing = await getChallenge(id);
    if (!existing) return { ok: false, error: "CHALLENGE_NOT_FOUND" };
    await ensureChallengeAuthority(existing.org_id);
    await deleteChallenge(id);
    revalidatePath("/admin/challenges");
    if (existing.org_id) {
      revalidatePath(`/dashboard/organization/${existing.org_id}/challenges`);
    }
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Challenges (user-side) ────────────────────────────────────────────────

export async function joinChallengeAction(
  challengeId: string
): Promise<{ data: UserChallenge | null; error: string | null }> {
  try {
    const ctx = await requireSession();
    const ch = await getChallenge(challengeId);
    if (!ch) return { data: null, error: "CHALLENGE_NOT_FOUND" };

    // For org-scoped challenges, require active membership.
    if (ch.org_id) {
      await requireOrgRole(ch.org_id);
    }
    const data = await joinChallenge({
      userId: ctx.userId,
      challengeId,
    });
    await writeAuditLog({
      action: "challenge_joined",
      resourceType: "challenge",
      resourceId: challengeId,
      orgId: ch.org_id,
      actorUserId: ctx.userId,
    });
    revalidatePath("/dashboard/challenges");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function completeChallengeAction(challengeId: string): Promise<{
  ok: boolean;
  pointsAwarded: number;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const result = await completeChallenge({
      userId: ctx.userId,
      challengeId,
    });
    if (result.ok) {
      await writeAuditLog({
        action: "challenge_completed",
        resourceType: "challenge",
        resourceId: challengeId,
        actorUserId: ctx.userId,
        newValue: { pointsAwarded: result.pointsAwarded },
      });
    }
    revalidatePath("/dashboard/challenges");
    return {
      ok: result.ok,
      pointsAwarded: result.pointsAwarded,
      error: result.error ?? null,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, pointsAwarded: 0, error: err.code };
    }
    return {
      ok: false,
      pointsAwarded: 0,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function listMyChallengesAction(): Promise<{
  data: UserChallenge[];
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const data = await listMyChallenges(ctx.userId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Rewards ───────────────────────────────────────────────────────────────

export async function listRewardsAction(): Promise<{
  data: Reward[];
  error: string | null;
}> {
  try {
    await requireSession();
    const data = await listRewards();
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function upsertRewardAction(opts: {
  id?: string;
  input: UpsertRewardInput;
}): Promise<{ data: Reward | null; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    const data = await upsertReward({
      id: opts.id,
      input: opts.input,
      userId: ctx.userId,
    });
    revalidatePath("/admin/rewards");
    revalidatePath("/dashboard/rewards");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function deleteRewardAction(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await requireSystemAdmin();
    await deleteReward(id);
    revalidatePath("/admin/rewards");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function redeemRewardAction(
  rewardId: string
): Promise<{ ok: boolean; redemptionId?: string; error: string | null }> {
  try {
    const ctx = await requireSession();
    const reward = await getReward(rewardId);
    if (!reward) return { ok: false, error: "REWARD_NOT_FOUND" };
    const result = await redeemReward({ userId: ctx.userId, rewardId });
    if (!result.ok) return { ok: false, error: result.error };
    await writeAuditLog({
      action: "reward_redeemed",
      resourceType: "reward",
      resourceId: rewardId,
      actorUserId: ctx.userId,
      newValue: {
        redemptionId: result.redemptionId,
        pointsSpent: reward.points_cost,
      },
    });
    revalidatePath("/dashboard/rewards");
    return { ok: true, redemptionId: result.redemptionId, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function listMyRedemptionsAction(): Promise<{
  data: Redemption[];
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const data = await listMyRedemptions(ctx.userId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Points / leaderboard ──────────────────────────────────────────────────

export async function getLeaderboardAction(
  window: LeaderboardWindow = "all"
): Promise<{ data: LeaderboardRow[]; error: string | null }> {
  try {
    await requireSession();
    const data = await getLeaderboard(window);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getMyPointHistoryAction(): Promise<{
  data: GreenPointLog[];
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const db = createServiceClient();
    const { data, error } = await db
      .from("GreenPointLogs")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { data: (data ?? []) as GreenPointLog[], error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Admin convenience: manual point adjustment (e.g. customer-support credit).
 */
export async function adjustPointsAction(opts: {
  userId: string;
  points: number;
  reason: string;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    const id = await earnPoints({
      userId: opts.userId,
      points: opts.points,
      reason: opts.reason || "Admin adjustment",
      relatedType: "admin_adjustment",
    });
    if (!id) return { ok: false, error: "POINT_AWARD_FAILED" };
    await writeAuditLog({
      action: "points_adjusted",
      resourceType: "user",
      resourceId: opts.userId,
      actorUserId: ctx.userId,
      newValue: { points: opts.points, reason: opts.reason },
    });
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
