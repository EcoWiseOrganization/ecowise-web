/**
 * Server-only org-member helpers (Phase 3).
 *
 * Mutations are gated by org-admin role at the action layer; these helpers
 * only perform the database work + BR-26 guard.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import type { MemberRole, MemberStatus } from "@/types/organization.types";

/** Translate the friendly role label used in the UI back into the role_id UUID. */
export function roleIdFromLabel(role: MemberRole): string {
  if (role === "Organization Admin") return ROLE_ADMIN_ID;
  // Default member role id (matches src/lib/roles.ts ROLE_MEMBER_ID)
  return "b2c3d4e5-f6a7-8901-bcde-f12345678901";
}

/**
 * BR-26: returns true when removing or demoting `targetUserId` would leave
 * `orgId` without any active Organization Admin.
 */
export async function wouldLeaveOrgWithoutAdmin(
  orgId: string,
  targetUserId: string
): Promise<boolean> {
  const db = createServiceClient();

  const { data: target } = await db
    .from("OrganizationMembers")
    .select("role_id, status")
    .eq("org_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) return false;
  if (target.role_id !== ROLE_ADMIN_ID) return false;

  const { count } = await db
    .from("OrganizationMembers")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role_id", ROLE_ADMIN_ID)
    .eq("status", "Active")
    .neq("user_id", targetUserId);

  return (count ?? 0) === 0;
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: MemberRole
): Promise<void> {
  const db = createServiceClient();
  const { data: member } = await db
    .from("OrganizationMembers")
    .select("user_id, role_id")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!member) throw new Error("MEMBER_NOT_FOUND");

  // BR-26 guard for demotion
  const newRoleId = roleIdFromLabel(newRole);
  if (member.role_id === ROLE_ADMIN_ID && newRoleId !== ROLE_ADMIN_ID) {
    const blocked = await wouldLeaveOrgWithoutAdmin(orgId, member.user_id);
    if (blocked) throw new Error("MSG26");
  }

  const { error } = await db
    .from("OrganizationMembers")
    .update({ role_id: newRoleId })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function setMemberStatus(
  orgId: string,
  memberId: string,
  status: MemberStatus
): Promise<void> {
  const db = createServiceClient();
  const { data: member } = await db
    .from("OrganizationMembers")
    .select("user_id, role_id, status")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!member) throw new Error("MEMBER_NOT_FOUND");

  // BR-26: don't deactivate the last admin
  if (
    member.role_id === ROLE_ADMIN_ID &&
    member.status === "Active" &&
    status !== "Active"
  ) {
    const blocked = await wouldLeaveOrgWithoutAdmin(orgId, member.user_id);
    if (blocked) throw new Error("MSG26");
  }

  const { error } = await db
    .from("OrganizationMembers")
    .update({ status })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

/**
 * Remove an employee from an org.
 *
 * Soft-delete by default — flips `status` to `Inactive` so the row (and
 * everything FK'd off it: emission_logs.created_by, audit_logs,
 * UserChallenges, etc.) stays intact for reporting & BR-03 retention.
 * A previously-inactive employee re-invited later picks up where they
 * left off because the membership row never disappeared.
 *
 * The hard-delete path is reserved for rows that have never been Active
 * (e.g. a Pending invite the admin wants to revoke before the user even
 * accepts). In that narrow case there's no history to preserve, so we
 * scrub the row entirely.
 *
 * The last-admin guard (BR-26) still runs in both paths.
 */
export async function removeMember(orgId: string, memberId: string): Promise<void> {
  const db = createServiceClient();
  const { data: member } = await db
    .from("OrganizationMembers")
    .select("user_id, role_id, status")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!member) throw new Error("MEMBER_NOT_FOUND");

  if (member.role_id === ROLE_ADMIN_ID) {
    const blocked = await wouldLeaveOrgWithoutAdmin(orgId, member.user_id);
    if (blocked) throw new Error("MSG26");
  }

  // Pending invitee = never had access; safe to hard-delete since the
  // employee has no historical artifacts attached to this membership.
  if (member.status === "Pending") {
    const { error } = await db
      .from("OrganizationMembers")
      .delete()
      .eq("id", memberId)
      .eq("org_id", orgId);
    if (error) throw new Error(error.message);
    return;
  }

  // Everyone else: soft-delete so audit trail + emission_logs ownership
  // + last_active timestamps continue to resolve.
  const { error } = await db
    .from("OrganizationMembers")
    .update({ status: "Inactive" })
    .eq("id", memberId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);
}
