import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { tierFromPoints } from "@/lib/profile";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import type {
  SustainabilityStats,
  UpdateProfileInput,
  User,
} from "@/types/user.types";

/**
 * Look up an auth.users row by email by paginating `auth.admin.listUsers`.
 * Returns `null` if not found within the page cap.
 *
 * Supabase JS v2.98 has no `getUserByEmail` on `auth.admin`, so the only
 * supported path is paginated listUsers. We cap pages at MAX_PAGES so a
 * runaway loop on a corrupt result set can't burn the admin API quota.
 * 100 pages × 1000 perPage = 100 000 users — well above current scale.
 *
 * Email is normalised on both sides so case/whitespace variants don't
 * silently miss.
 */
async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const target = email.trim().toLowerCase();
  const PER_PAGE = 1000;
  const MAX_PAGES = 100;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) {
      console.error("[user.service] findAuthUserByEmail listUsers failed", error);
      return null;
    }
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").trim().toLowerCase() === target);
    if (hit) return hit;
    if (users.length < PER_PAGE) return null; // reached the end
  }
  console.warn(
    "[user.service] findAuthUserByEmail hit MAX_PAGES — caller treated as not found",
    { email: target },
  );
  return null;
}

/**
 * Returns true if the email is registered in Supabase Auth
 * exclusively via Google OAuth (no email/password identity).
 *
 * Previously paginated only the first 1000 users, so at any non-trivial
 * scale this silently mis-classified Google-only accounts as "not
 * Google-only" and let the email/OTP path proceed for users who couldn't
 * actually authenticate that way.
 */
export async function checkIsGoogleOnlyAccount(email: string): Promise<boolean> {
  try {
    const user = await findAuthUserByEmail(email);
    if (!user) return false;
    const providers = (user.identities ?? []).map((id) => id.provider);
    // Google-only: has at least one identity, all of them are "google"
    return providers.length > 0 && providers.every((p) => p === "google");
  } catch {
    return false;
  }
}

/**
 * Returns true if Supabase Auth has a user row for this email — under
 * any identity. Used by forgot-password and OAuth flows that need
 * "does this email exist?" without leaking the answer to the client.
 */
export async function checkAuthUserExists(email: string): Promise<boolean> {
  try {
    return (await findAuthUserByEmail(email)) !== null;
  } catch {
    return false;
  }
}

/** Same lookup but returns the auth user row so callers can inspect id /
 * identities without another round trip. Returns null when not found. */
export async function getAuthUserByEmail(email: string) {
  return findAuthUserByEmail(email);
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

/**
 * Display-only projection of a User row for the admin list. Excludes PII
 * the table never shows (`phone`, `bio`, `avatar_url`) so we don't ship
 * private fields into the SSR payload of every page render.
 */
export type AdminUserListRow = Pick<
  User,
  | "id"
  | "email"
  | "full_name"
  | "user_name"
  | "is_admin"
  | "status"
  | "green_points"
  | "created_at"
>;

const ADMIN_USER_LIST_COLUMNS =
  "id, email, full_name, user_name, is_admin, status, green_points, created_at" as const;

export interface ListUsersResult {
  rows: AdminUserListRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Paginated, projected listing for `/admin/users`. Replaces the old
 * `getAllUsers()` which loaded every row with `select("*")` — at scale
 * that dumped megabytes of PII into the SSR payload and made the page
 * slower with every signup.
 *
 * - `pageSize` is clamped to [1, 100] so a crafted URL can't bypass.
 * - `search` runs a case-insensitive `ilike` over `email` / `full_name`
 *   / `user_name`. Substring is escaped for `%` / `_` / `,` to neutralise
 *   PostgREST `.or()` injection.
 */
export async function listAdminUsers({
  page = 1,
  pageSize = 25,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<ListUsersResult> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 25));

  const db = createAdminClient();
  let query = db
    .from("User")
    .select(ADMIN_USER_LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((safePage - 1) * safePageSize, safePage * safePageSize - 1);

  const term = search?.trim();
  if (term) {
    // Escape PostgREST `.or()` delimiters before interpolation; the comma
    // is the OR-clause separator and `(/)` would close the call.
    const escaped = term.replace(/[,()%_]/g, (c) =>
      c === "," ? " " : `\\${c}`,
    );
    query = query.or(
      `email.ilike.%${escaped}%,full_name.ilike.%${escaped}%,user_name.ilike.%${escaped}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return {
    rows: (data ?? []) as AdminUserListRow[],
    total: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

/** Projection used for the System Admin "Export users" feature. */
export type AdminUserExportRow = Pick<
  User,
  | "id"
  | "email"
  | "full_name"
  | "user_name"
  | "phone"
  | "is_admin"
  | "status"
  | "green_points"
  | "created_at"
  | "last_login_at"
>;

/**
 * Read every user row for export (no pagination). Caller MUST guard with
 * `requireSystemAdmin()` first — we deliberately bypass RLS via the admin
 * client and skip soft-deleted rows from the dump.
 */
export async function listUsersForExport(): Promise<AdminUserExportRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("User")
    .select(
      "id, email, full_name, user_name, phone, is_admin, status, green_points, created_at, last_login_at",
    )
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch users for export: ${error.message}`);
  return (data ?? []) as AdminUserExportRow[];
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
