/**
 * organizationService.ts
 * All Supabase calls related to Organizations and their Members.
 * Uses the browser (client-side) Supabase client — call only from
 * "use client" components or custom hooks.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  OrgType,
} from "@/types/database.types";

// ── Input DTOs ───────────────────────────────────────────────────

export interface CreateOrganizationInput {
  name: string;
  tax_code: string;
  industry: string;
  org_type: OrgType;
}

// ── Organization CRUD ────────────────────────────────────────────

/**
 * Creates a new organization and immediately adds the calling user
 * as "Organization Admin" in organization_members.
 *
 * Both inserts are performed sequentially. If the member insert fails
 * the org record is left orphaned (Supabase transactions via RPC are
 * recommended for production; this is intentionally simple for clarity).
 */
export async function createOrganization(
  input: CreateOrganizationInput,
  userId: string
): Promise<Organization> {
  const supabase = createClient();

  // 1. Insert the organization row
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: input.name.trim(),
      tax_code: input.tax_code.trim(),
      industry: input.industry,
      org_type: input.org_type,
      created_by: userId,
    })
    .select()
    .single();

  if (orgError) {
    // Provide a human-readable message for the most common constraint
    if (orgError.code === "23505") {
      throw new Error(
        "An organization with this tax code already exists. Please use a different code."
      );
    }
    throw new Error(orgError.message);
  }

  // 2. Add the creator as Organization Admin
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: userId,
      role: "Organization Admin",
      status: "Active",
    });

  if (memberError) {
    throw new Error(
      `Organization created but could not assign admin role: ${memberError.message}`
    );
  }

  return org as Organization;
}

/**
 * Fetches all organizations the current user is an Active member of.
 */
export async function getMyOrganizations(): Promise<Organization[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Organization[];
}

/**
 * Fetches a single organization by id.
 * RLS guarantees only members of that org can read it.
 */
export async function getOrganizationById(
  orgId: string
): Promise<Organization | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found / no RLS access
    throw new Error(error.message);
  }
  return data as Organization;
}

// ── Organization Members ─────────────────────────────────────────

/**
 * Fetches all Active members of an organization, joined with their
 * public.User profile for display purposes.
 */
export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMemberWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      id,
      org_id,
      user_id,
      role,
      status,
      created_at,
      user:User ( id, full_name, user_name, email )
    `)
    .eq("org_id", orgId)
    .eq("status", "Active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrganizationMemberWithUser[];
}

/**
 * Returns the calling user's membership record for a given org,
 * or null if they are not a member.
 */
export async function getMyMembership(
  orgId: string,
  userId: string
): Promise<OrganizationMember | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as OrganizationMember;
}
