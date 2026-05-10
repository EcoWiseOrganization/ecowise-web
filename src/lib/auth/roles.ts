/**
 * Server-side authorization helpers (Phase 0).
 *
 * Use in Server Actions, Route Handlers, and Server Components to centralize
 * the auth checks described in `docs/plan.md §1.2` and the SRS §1.4.2.1 screen
 * authorization matrix.
 *
 *   • requireSession()           — any authenticated user
 *   • requireSystemAdmin()       — User.is_admin = true
 *   • requireOrgRole(orgId, …)   — Active OrganizationMembers row, optionally
 *                                  restricted to Organization Admin
 *   • getCurrentUserContext()    — non-throwing inspection variant
 *
 * Each `require*` returns the resolved context on success or throws an
 * `AuthError` with a code mapped to {@link MSG}. Callers should translate the
 * code via i18n / map to HTTP 401/403.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import { MSG } from "@/lib/messages";

// ── Types ─────────────────────────────────────────────────────────────────

export type ActorRole =
  | "system_admin"
  | "org_admin"
  | "employee"
  | "individual"
  | "guest"
  | "system";

export interface UserContext {
  /** Supabase auth user id. */
  userId: string;
  /** Email from auth.users (may be empty for OAuth users without email). */
  email: string | null;
  /** True when public.User.is_admin = true. */
  isSystemAdmin: boolean;
}

export interface OrgMembershipContext extends UserContext {
  orgId: string;
  roleId: string | null;
  isOrgAdmin: boolean;
  status: "Active" | "Pending" | string;
}

// ── AuthError ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  constructor(code: string, message?: string, httpStatus = 403) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ── Internal: load is_admin flag without RLS recursion ────────────────────

async function loadIsAdmin(userId: string): Promise<boolean> {
  // Using the service client is robust against RLS recursion + works in edge.
  const db = createServiceClient();
  const { data, error } = await db
    .from("User")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (error) return false;
  return data?.is_admin === true;
}

// ── Public: getCurrentUserContext (non-throwing) ──────────────────────────

/**
 * Returns the current user context, or `null` if no session.
 * Does not throw.
 */
export async function getCurrentUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const isSystemAdmin = await loadIsAdmin(user.id);
  return {
    userId: user.id,
    email: user.email ?? null,
    isSystemAdmin,
  };
}

// ── Public: requireSession ────────────────────────────────────────────────

/**
 * Throws AuthError(AUTH_REQUIRED, 401) if no user is authenticated.
 */
export async function requireSession(): Promise<UserContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    throw new AuthError(MSG.NOT_AUTHENTICATED, "Authentication required.", 401);
  }
  return ctx;
}

// ── Public: requireSystemAdmin ────────────────────────────────────────────

/**
 * Throws if the caller is not a System Admin.
 */
export async function requireSystemAdmin(): Promise<UserContext> {
  const ctx = await requireSession();
  if (!ctx.isSystemAdmin) {
    throw new AuthError(
      MSG.NOT_SYSTEM_ADMIN,
      "System Administrator privilege required.",
      403
    );
  }
  return ctx;
}

// ── Public: requireOrgRole ────────────────────────────────────────────────

export interface RequireOrgOptions {
  /** When true, only Organization Admin role may pass. */
  adminOnly?: boolean;
  /**
   * When true, System Admins are allowed to bypass org membership check
   * (read-only operations). Defaults to false: critical mutations should
   * almost always require explicit org membership.
   */
  allowSystemAdmin?: boolean;
}

/**
 * Verifies that the caller is an Active member of the given organization.
 * If `adminOnly: true`, also verifies role_id = ROLE_ADMIN_ID.
 *
 * Returns the merged user + membership context on success.
 */
export async function requireOrgRole(
  orgId: string,
  options: RequireOrgOptions = {}
): Promise<OrgMembershipContext> {
  if (!orgId) {
    throw new AuthError("INVALID_INPUT", "orgId is required.", 400);
  }
  const ctx = await requireSession();

  if (options.allowSystemAdmin && ctx.isSystemAdmin) {
    return {
      ...ctx,
      orgId,
      roleId: null,
      isOrgAdmin: true, // sys admin can act with admin privileges if explicitly allowed
      status: "Active",
    };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("OrganizationMembers")
    .select("role_id, status")
    .eq("org_id", orgId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) {
    throw new AuthError(MSG.NOT_ORG_MEMBER, error.message, 403);
  }
  if (!data || data.status !== "Active") {
    throw new AuthError(
      MSG.NOT_ORG_MEMBER,
      "Caller is not an active member of this organization.",
      403
    );
  }

  const isOrgAdmin = data.role_id === ROLE_ADMIN_ID;
  if (options.adminOnly && !isOrgAdmin) {
    throw new AuthError(
      MSG.NOT_ORG_ADMIN,
      "Organization Admin privilege required.",
      403
    );
  }

  return {
    ...ctx,
    orgId,
    roleId: data.role_id ?? null,
    isOrgAdmin,
    status: data.status,
  };
}

// ── Helper: derive ActorRole label for audit logs ─────────────────────────

/**
 * Best-effort role label for the audit_logs.actor_role column.
 * For org-scoped contexts, prefer `actorRoleFromMembership`.
 */
export function actorRoleFromUser(ctx: UserContext | null): ActorRole {
  if (!ctx) return "guest";
  if (ctx.isSystemAdmin) return "system_admin";
  return "individual";
}

export function actorRoleFromMembership(ctx: OrgMembershipContext): ActorRole {
  if (ctx.isSystemAdmin) return "system_admin";
  if (ctx.isOrgAdmin) return "org_admin";
  return "employee";
}
