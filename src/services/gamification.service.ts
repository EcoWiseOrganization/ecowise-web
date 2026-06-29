/**
 * Server-only gamification service (Phase 9).
 * Atomic point/redeem operations go through Postgres functions
 * earn_green_points and redeem_reward (migration 014).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildLeaderboard,
  filterLogsToWindow,
  POINTS_PER_VERIFIED_LOG,
} from "@/lib/gamification";
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

// ── Challenges ────────────────────────────────────────────────────────────

export async function listChallenges(opts: {
  orgId?: string | null;
  /** Multiple orgs in one call (replaces the N+1 loop on /dashboard/challenges). */
  orgIds?: string[];
  /** include global challenges (org_id IS NULL). */
  includeGlobal?: boolean;
}): Promise<Challenge[]> {
  const db = createServiceClient();
  let q = db
    .from("Challenges")
    .select("*")
    .order("start_date", { ascending: false });

  if (opts.orgIds && opts.orgIds.length > 0) {
    // Batch case: pull all rows for the supplied orgs in one round trip
    // and optionally union global challenges (org_id IS NULL).
    if (opts.includeGlobal) {
      const inList = opts.orgIds.map((id) => `"${id}"`).join(",");
      q = q.or(`org_id.is.null,org_id.in.(${inList})`);
    } else {
      q = q.in("org_id", opts.orgIds);
    }
  } else if (opts.orgId !== undefined) {
    if (opts.orgId === null) {
      q = q.is("org_id", null);
    } else if (opts.includeGlobal) {
      q = q.or(`org_id.is.null,org_id.eq.${opts.orgId}`);
    } else {
      q = q.eq("org_id", opts.orgId);
    }
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Challenge[];
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("Challenges")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Challenge) ?? null;
}

export async function upsertChallenge(opts: {
  id?: string;
  input: UpsertChallengeInput;
  userId: string;
}): Promise<Challenge> {
  const db = createServiceClient();
  if (opts.id) {
    const { data, error } = await db
      .from("Challenges")
      .update({
        name: opts.input.name,
        category: opts.input.category,
        target_audience: opts.input.target_audience ?? "all",
        description: opts.input.description ?? null,
        rules: opts.input.rules ?? {},
        points_reward: opts.input.points_reward,
        duration_days: opts.input.duration_days,
        verification_method: opts.input.verification_method ?? "Honor",
        status: opts.input.status ?? "Draft",
        start_date: opts.input.start_date,
        end_date: opts.input.end_date,
        image_url: opts.input.image_url ?? null,
        org_id: opts.input.org_id ?? null,
      })
      .eq("id", opts.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Challenge;
  }
  const { data, error } = await db
    .from("Challenges")
    .insert({
      name: opts.input.name,
      category: opts.input.category,
      target_audience: opts.input.target_audience ?? "all",
      description: opts.input.description ?? null,
      rules: opts.input.rules ?? {},
      points_reward: opts.input.points_reward,
      duration_days: opts.input.duration_days,
      verification_method: opts.input.verification_method ?? "Honor",
      status: opts.input.status ?? "Draft",
      start_date: opts.input.start_date,
      end_date: opts.input.end_date,
      image_url: opts.input.image_url ?? null,
      org_id: opts.input.org_id ?? null,
      created_by: opts.userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Challenge;
}

export async function deleteChallenge(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("Challenges").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── User challenges (join / progress / complete) ─────────────────────────

export async function joinChallenge(opts: {
  userId: string;
  challengeId: string;
}): Promise<UserChallenge> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("UserChallenges")
    .upsert(
      {
        user_id: opts.userId,
        challenge_id: opts.challengeId,
        status: "Joined",
        progress: {},
        joined_at: new Date().toISOString(),
      },
      { onConflict: "user_id,challenge_id" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as UserChallenge;
}

export async function listMyChallenges(userId: string): Promise<UserChallenge[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("UserChallenges")
    .select("*")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserChallenge[];
}

export async function completeChallenge(opts: {
  userId: string;
  challengeId: string;
  evidence_url?: string;
}): Promise<{ ok: boolean; pointsAwarded: number; status?: string; error?: string }> {
  const db = createServiceClient();
  const { data: challenge } = await db
    .from("Challenges")
    .select("*")
    .eq("id", opts.challengeId)
    .maybeSingle();
  if (!challenge) return { ok: false, pointsAwarded: 0, error: "CHALLENGE_NOT_FOUND" };

  const now = new Date();
  const endDate = new Date(challenge.end_date);
  endDate.setHours(23, 59, 59, 999);
  
  // BR-14: must be inside active timeframe
  if (
    new Date(challenge.start_date) > now ||
    endDate < now
  ) {
    return { ok: false, pointsAwarded: 0, error: "CHALLENGE_NOT_ACTIVE" };
  }

  const { data: uc } = await db
    .from("UserChallenges")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("challenge_id", opts.challengeId)
    .maybeSingle();
  if (!uc) return { ok: false, pointsAwarded: 0, error: "NOT_JOINED" };
  if (uc.status === "Completed") {
    return { ok: false, pointsAwarded: 0, error: "ALREADY_COMPLETED" };
  }
  if (uc.status === "PendingReview") {
    return { ok: false, pointsAwarded: 0, error: "ALREADY_PENDING" };
  }

  const needsReview = challenge.verification_method === "Photo";
  const newStatus = needsReview ? "PendingReview" : "Completed";

  const updateData: Record<string, unknown> = {
    status: newStatus,
  };
  
  if (opts.evidence_url) {
    updateData.evidence_url = opts.evidence_url;
  }
  
  if (newStatus === "Completed" || newStatus === "PendingReview") {
    updateData.completed_at = now.toISOString();
  }

  await db
    .from("UserChallenges")
    .update(updateData)
    .eq("id", uc.id);

  if (newStatus === "PendingReview") {
    return { ok: true, pointsAwarded: 0, status: newStatus };
  }

  const points = Number(challenge.points_reward) || 0;
  if (points > 0) {
    await earnPoints({
      userId: opts.userId,
      points,
      reason: `Challenge completed: ${challenge.name}`,
      relatedId: challenge.id,
      relatedType: "challenge",
    });
  }
  return { ok: true, pointsAwarded: points, status: newStatus };
}

export async function getPendingChallengeSubmissions(): Promise<Record<string, unknown>[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("UserChallenges")
    .select(`
      *,
      challenge:Challenges (id, name, points_reward, org_id)
    `)
    .eq("status", "PendingReview")
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);
  
  const submissions = (data ?? []) as Record<string, unknown>[];
  if (submissions.length === 0) return submissions;

  const userIds = Array.from(new Set(submissions.map((s) => s.user_id as string)));
  const { data: users } = await db
    .from("User")
    .select("id, full_name, user_name, email")
    .in("id", userIds);
    
  const userMap = new Map((users ?? []).map(u => [u.id, u]));
  
  return submissions.map(sub => ({
    ...sub,
    user: userMap.get(sub.user_id as string) ?? null
  }));
}

// ── Points (earn / spend) ────────────────────────────────────────────────

/**
 * Admin-side signed adjustment via `adjust_green_points` (migration 030).
 * Returns the GreenPointLogs row id on success, or null on RPC failure.
 * Negative deltas are floored against the user's current balance — the
 * RPC will never push `User.green_points` below 0.
 */
export async function adjustPoints(opts: {
  userId: string;
  delta: number;
  reason: string;
  relatedId?: string | null;
  relatedType?: string | null;
}): Promise<{ logId: string | null; error: string | null }> {
  if (opts.delta === 0) return { logId: null, error: "ZERO_DELTA" };
  const db = createServiceClient();
  const { data, error } = await db.rpc("adjust_green_points", {
    p_user_id: opts.userId,
    p_delta: Math.trunc(opts.delta),
    p_reason: opts.reason,
    p_related_id: opts.relatedId ?? null,
    p_related_type: opts.relatedType ?? null,
  });
  if (error) {
    const msg = (error.message ?? "").toUpperCase();
    if (msg.includes("USER_NOT_FOUND")) return { logId: null, error: "USER_NOT_FOUND" };
    if (msg.includes("BALANCE_ZERO")) return { logId: null, error: "BALANCE_ZERO" };
    if (msg.includes("ZERO_DELTA")) return { logId: null, error: "ZERO_DELTA" };
    console.error("[gamification] adjust_green_points failed", error.message);
    return { logId: null, error: "POINT_ADJUST_FAILED" };
  }
  return { logId: (data as string | null) ?? null, error: null };
}

export async function earnPoints(opts: {
  userId: string;
  points: number;
  reason: string;
  relatedId?: string | null;
  relatedType?: string | null;
}): Promise<string | null> {
  if (opts.points <= 0) return null;
  const db = createServiceClient();
  const { data, error } = await db.rpc("earn_green_points", {
    p_user_id: opts.userId,
    p_points: opts.points,
    p_reason: opts.reason,
    p_related_id: opts.relatedId ?? null,
    p_related_type: opts.relatedType ?? null,
  });
  if (error) {
    console.error("[gamification] earn_green_points failed", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function awardPointsForVerifiedLog(opts: {
  userId: string | null;
  emissionLogId: string;
}): Promise<void> {
  if (!opts.userId) return;
  await earnPoints({
    userId: opts.userId,
    points: POINTS_PER_VERIFIED_LOG,
    reason: "Verified emission log",
    relatedId: opts.emissionLogId,
    relatedType: "emission_log",
  });
}

// ── Rewards ───────────────────────────────────────────────────────────────

export async function listRewards(): Promise<Reward[]> {
  const db = createServiceClient();
  // Hide rewards explicitly marked Inactive — they're still reachable
  // by id for historical Redemption lookups, but shouldn't appear in
  // the user-facing catalog. Active + LowStock both surface.
  const { data, error } = await db
    .from("Rewards")
    .select("*")
    .neq("status", "Inactive")
    .order("points_cost", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Reward[];
}

export async function getReward(id: string): Promise<Reward | null> {
  const db = createServiceClient();
  const { data } = await db.from("Rewards").select("*").eq("id", id).maybeSingle();
  return (data as Reward) ?? null;
}

export async function upsertReward(opts: {
  id?: string;
  input: UpsertRewardInput;
  userId: string;
}): Promise<Reward> {
  const db = createServiceClient();
  if (opts.id) {
    const { data, error } = await db
      .from("Rewards")
      .update({
        name: opts.input.name,
        category: opts.input.category ?? null,
        sku: opts.input.sku ?? null,
        description: opts.input.description ?? null,
        image_url: opts.input.image_url ?? null,
        points_cost: opts.input.points_cost,
        total_stock: opts.input.total_stock,
        fulfillment: opts.input.fulfillment ?? "Digital",
        status: opts.input.status ?? "Active",
      })
      .eq("id", opts.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Reward;
  }
  const { data, error } = await db
    .from("Rewards")
    .insert({
      name: opts.input.name,
      category: opts.input.category ?? null,
      sku: opts.input.sku ?? null,
      description: opts.input.description ?? null,
      image_url: opts.input.image_url ?? null,
      points_cost: opts.input.points_cost,
      total_stock: opts.input.total_stock,
      fulfillment: opts.input.fulfillment ?? "Digital",
      status: opts.input.status ?? "Active",
      created_by: opts.userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Reward;
}

export async function deleteReward(id: string): Promise<void> {
  const db = createServiceClient();
  // Soft archive: never hard-delete a reward to preserve historical redemptions.
  const { error } = await db
    .from("Rewards")
    .update({ status: "Inactive" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * BR-13 atomic redeem via Postgres function. Maps RPC errors to friendly
 * codes the UI already translates.
 */
export async function redeemReward(opts: {
  userId: string;
  rewardId: string;
}): Promise<{ ok: true; redemptionId: string } | { ok: false; error: string }> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("redeem_reward", {
    p_reward_id: opts.rewardId,
    p_user_id: opts.userId,
  });
  if (error) {
    const msg = (error.message ?? "").toUpperCase();
    if (msg.includes("REWARD_NOT_FOUND")) return { ok: false, error: "REWARD_NOT_FOUND" };
    if (msg.includes("REWARD_INACTIVE")) return { ok: false, error: "REWARD_INACTIVE" };
    if (msg.includes("REWARD_OUT_OF_STOCK")) return { ok: false, error: "REWARD_OUT_OF_STOCK" };
    if (msg.includes("INSUFFICIENT_POINTS")) return { ok: false, error: "INSUFFICIENT_POINTS" };
    return { ok: false, error: error.message };
  }
  return { ok: true, redemptionId: data as string };
}

export async function listMyRedemptions(userId: string): Promise<Redemption[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Redemptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Redemption[];
}

// ── Leaderboard ───────────────────────────────────────────────────────────

export type LeaderboardWindow = "all" | "month" | "week";

export async function getLeaderboard(
  window: LeaderboardWindow = "all",
  limit = 25
): Promise<LeaderboardRow[]> {
  const db = createServiceClient();

  // Pull Earn logs for the window. For "all", omit the time filter.
  let q = db
    .from("GreenPointLogs")
    .select("user_id, points, created_at")
    .eq("action", "Earn")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (window !== "all") {
    const days = window === "week" ? 7 : 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    q = q.gte("created_at", since);
  }
  const { data: logsRaw, error } = await q;
  if (error) throw new Error(error.message);
  const logs = (logsRaw ?? []) as GreenPointLog[];

  // For "all", we could also use the User.green_points balance as a faster
  // alternative but the log-based approach lets us window correctly.

  // Resolve user names in one query.
  const userIds = Array.from(new Set(logs.map((l) => l.user_id)));
  const { data: users } = userIds.length
    ? await db
      .from("User")
      .select("id, full_name, user_name, email")
      .in("id", userIds)
    : { data: [] as unknown[] };

  const nameMap = new Map<string, { display_name: string; email: string }>();
  for (const u of (users ?? []) as Array<{
    id: string;
    full_name: string | null;
    user_name: string | null;
    email: string;
  }>) {
    nameMap.set(u.id, {
      display_name: u.full_name ?? u.user_name ?? u.email,
      email: u.email,
    });
  }

  const filtered =
    window === "all"
      ? logs
      : filterLogsToWindow(
        logs,
        new Date(Date.now() - (window === "week" ? 7 : 30) * 86_400_000).toISOString(),
        new Date().toISOString()
      );

  const rows = buildLeaderboard(filtered, (id) =>
    nameMap.get(id) ?? { display_name: "Anonymous", email: "" }
  );
  return rows.slice(0, limit);
}
