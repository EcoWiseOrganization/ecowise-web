import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { tierFromPoints } from "@/lib/profile";
import type {
  SustainabilityStats,
  UpdateProfileInput,
  User,
} from "@/types/user.types";

/**
 * Returns true if the email is registered in Supabase Auth
 * exclusively via Google OAuth (no email/password identity).
 */
export async function checkIsGoogleOnlyAccount(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (error || !data?.users?.length) return false;
    const user = data.users.find((u) => u.email === email);
    if (!user) return false;
    const providers = (user.identities ?? []).map((id) => id.provider);
    // Google-only: has at least one identity, all of them are "google"
    return providers.length > 0 && providers.every((p) => p === "google");
  } catch {
    return false;
  }
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("User")
    .select("user_name, full_name")
    .eq("id", userId)
    .single();

  return data;
}

export async function getIsAdmin(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("User")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return data?.is_admin === true;
}

export async function getDashboardPath(userId: string) {
  const isAdmin = await getIsAdmin(userId);
  return isAdmin ? "/admin" : "/dashboard";
}

export async function getUserStats() {
  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: adminCount },
    { count: activeCount },
  ] = await Promise.all([
    supabase.from("User").select("*", { count: "exact", head: true }),
    supabase
      .from("User")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", true),
    supabase
      .from("User")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    adminCount: adminCount ?? 0,
    activeCount: activeCount ?? 0,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("User")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data ?? [];
}

// ── Phase 1: Profile management ───────────────────────────────────────────

/**
 * Returns the full profile row for the given user. Uses the service client
 * so System Admins can read any user when wired into admin tooling.
 */
export async function getFullProfile(userId: string): Promise<User | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("User")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as User;
}

/**
 * Update the caller's own profile fields. Caller-side guard via
 * requireSession() should be applied before invoking this from a server
 * action.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<User> {
  const db = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (typeof input.full_name === "string") patch.full_name = input.full_name.trim();
  if (typeof input.user_name === "string") patch.user_name = input.user_name.trim();
  if (typeof input.phone === "string") patch.phone = input.phone.trim() || null;
  if (typeof input.bio === "string") patch.bio = input.bio.trim() || null;
  if (typeof input.avatar_url === "string") patch.avatar_url = input.avatar_url.trim() || null;

  if (Object.keys(patch).length === 0) {
    const existing = await getFullProfile(userId);
    if (!existing) throw new Error("Profile not found.");
    return existing;
  }

  const { data, error } = await db
    .from("User")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as User;
}

/** Compute aggregated sustainability stats for the profile screen. */
export async function getSustainabilityStats(
  userId: string
): Promise<SustainabilityStats> {
  const db = createServiceClient();

  const [{ data: userRow }, logsRes] = await Promise.all([
    db.from("User").select("green_points").eq("id", userId).single(),
    db
      .from("EmissionLogs")
      .select("co2e_result", { count: "exact" })
      .eq("created_by", userId),
  ]);

  const greenPoints = Number(userRow?.green_points ?? 0);
  const totalLogs = logsRes.count ?? 0;
  const totalCo2eKg = (logsRes.data ?? []).reduce(
    (sum, r) => sum + (Number((r as { co2e_result: number | null }).co2e_result) || 0),
    0
  );
  return {
    totalCo2eKg,
    totalLogs,
    greenPoints,
    tier: tierFromPoints(greenPoints),
  };
}

/**
 * BR-26 helper: returns true if the user is the *only* active Organization
 * Admin in at least one organization. Used to block deletions / role changes
 * that would leave an org without an admin.
 */
export async function isOnlyAdminOfAnyOrg(
  userId: string
): Promise<{ blocked: boolean; orgIds: string[] }> {
  const db = createServiceClient();

  const ROLE_ADMIN_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  // 1) orgs in which user is currently an active admin
  const { data: myAdminMemberships, error: e1 } = await db
    .from("OrganizationMembers")
    .select("org_id")
    .eq("user_id", userId)
    .eq("role_id", ROLE_ADMIN_ID)
    .eq("status", "Active");
  if (e1) throw new Error(e1.message);
  const myOrgIds = (myAdminMemberships ?? []).map((r) => r.org_id as string);

  if (myOrgIds.length === 0) return { blocked: false, orgIds: [] };

  // 2) for each, count other active admins
  const blockedOrgs: string[] = [];
  for (const orgId of myOrgIds) {
    const { count } = await db
      .from("OrganizationMembers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role_id", ROLE_ADMIN_ID)
      .eq("status", "Active")
      .neq("user_id", userId);
    if ((count ?? 0) === 0) blockedOrgs.push(orgId);
  }

  return { blocked: blockedOrgs.length > 0, orgIds: blockedOrgs };
}

/**
 * BR-02: anonymize the user account. PII fields scrubbed; emission_logs and
 * other historical data retained linked to the same anonymized id.
 *
 * The auth.users row is also deleted via admin client so the email cannot be
 * used to log in again. green_points zeroed.
 */
export async function anonymizeAndDeleteAccount(userId: string): Promise<void> {
  const db = createServiceClient();
  const admin = createAdminClient();

  // Scrub PII first
  const anonEmail = `deleted-${userId}@anonymous.invalid`;
  const { error: updateErr } = await db
    .from("User")
    .update({
      email: anonEmail,
      full_name: null,
      user_name: null,
      phone: null,
      bio: null,
      avatar_url: null,
      green_points: 0,
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (updateErr) throw new Error(updateErr.message);

  // Mark all active org memberships as inactive so user loses access
  await db
    .from("OrganizationMembers")
    .update({ status: "Pending" })
    .eq("user_id", userId);

  // Finally remove auth identity so login is no longer possible.
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    // Auth deletion failure is logged but non-fatal — the public.User row
    // is already anonymized so PII is gone.
    console.error("[user.service] anonymizeAndDeleteAccount auth.deleteUser failed", authErr);
  }
}
