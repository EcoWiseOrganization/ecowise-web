/**
 * organization.service.ts
 * All Supabase calls related to Organizations and their Members.
 * Uses the browser (client-side) Supabase client — call only from
 * "use client" components or custom hooks.
 */

import { createClient } from "@/lib/supabase/client";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  CreateOrganizationInput,
} from "@/types/organization.types";

// ── Organization CRUD ────────────────────────────────────────────

export async function createOrganization(
  input: CreateOrganizationInput,
  userId: string
): Promise<Organization> {
  const supabase = createClient();

  const { data: org, error: orgError } = await supabase
    .from("Organization")
    .insert({
      legal_name: input.legal_name.trim(),
      tax_code: input.tax_code.trim(),
      org_type: input.org_type,
      created_by: userId,
    })
    .select()
    .single();

  if (orgError) {
    if (orgError.code === "23505") {
      throw new Error(
        "An organization with this tax code already exists. Please use a different code."
      );
    }
    throw new Error(orgError.message);
  }

  const { error: memberError } = await supabase
    .from("OrganizationMembers")
    .insert({
      org_id: org.id,
      user_id: userId,
      role_id: ROLE_ADMIN_ID,
      status: "Active",
      created_by: userId,
    });

  if (memberError) {
    throw new Error(
      `Organization created but could not assign admin role: ${memberError.message}`
    );
  }

  return org as Organization;
}

export async function getMyOrganizations(): Promise<Organization[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Organization")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Organization[];
}

export async function getOrganizationById(
  orgId: string
): Promise<Organization | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Organization")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Organization;
}

// ── Organization Members ─────────────────────────────────────────

export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMemberWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("OrganizationMembers")
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

export async function getMyMembership(
  orgId: string,
  userId: string
): Promise<OrganizationMember | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("OrganizationMembers")
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
