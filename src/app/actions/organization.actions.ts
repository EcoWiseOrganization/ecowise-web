"use server";

/**
 * organization.actions.ts
 * Server Actions for Organization & Event mutations AND server-side reads.
 * Uses service client so RLS never blocks server-side operations.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  Event,
  EventAssignment,
  EventAssignmentWithUser,
} from "@/types/database.types";
import type { CreateOrganizationInput } from "@/services/organizationService";
import type { CreateEventInput, AssignEmployeeInput } from "@/services/eventService";

// ── Server-side reads ─────────────────────────────────────────────

/** Returns organizations where the current user is an Active member */
export async function getMyOrganizationsServer(): Promise<Organization[]> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return [];

  const db = createServiceClient();
  const { data } = await db
    .from("organizations")
    .select("*, organization_members!inner(user_id, status)")
    .eq("organization_members.user_id", user.id)
    .eq("organization_members.status", "Active")
    .order("created_at", { ascending: false });

  // Strip the joined organization_members from the result shape
  return ((data ?? []) as unknown as (Organization & { organization_members: unknown[] })[]).map(
    ({ organization_members: _m, ...org }) => org as Organization
  );
}

export async function getOrganizationByIdServer(orgId: string): Promise<Organization | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (error) return null;
  return data as Organization;
}

export async function getOrganizationMembersServer(orgId: string): Promise<OrganizationMemberWithUser[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("organization_members")
    .select(`id, org_id, user_id, role, status, created_at, user:User ( id, full_name, user_name, email )`)
    .eq("org_id", orgId)
    .eq("status", "Active")
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as OrganizationMemberWithUser[];
}

export async function getMyMembershipServer(orgId: string, userId: string): Promise<OrganizationMember | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as OrganizationMember;
}

export async function getEventsByOrgServer(orgId: string): Promise<Event[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("events")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Event[];
}

export async function getEventByIdServer(eventId: string): Promise<Event | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error) return null;
  return data as Event;
}

export async function getEventAssignmentsServer(eventId: string): Promise<EventAssignmentWithUser[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("event_assignments")
    .select(`id, event_id, user_id, assigned_by, created_at, user:User ( id, full_name, user_name, email )`)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as EventAssignmentWithUser[];
}

// ── Organization ──────────────────────────────────────────────────

export async function createOrganizationAction(
  input: CreateOrganizationInput
): Promise<{ data: Organization | null; error: string | null }> {
  // 1. Verify auth with user client
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  // 2. Perform writes with service client (bypasses RLS)
  const db = createServiceClient();

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({
      name: input.name.trim(),
      tax_code: input.tax_code.trim(),
      industry: input.industry,
      org_type: input.org_type,
      created_by: user.id,
    })
    .select()
    .single();

  if (orgError) {
    if (orgError.code === "23505") {
      return { data: null, error: "An organization with this tax code already exists." };
    }
    return { data: null, error: orgError.message };
  }

  // 3. Add creator as Organization Admin
  const { error: memberError } = await db
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: "Organization Admin",
      status: "Active",
    });

  if (memberError) {
    return { data: null, error: `Organization created but could not assign admin role: ${memberError.message}` };
  }

  return { data: org as Organization, error: null };
}

// ── Event ─────────────────────────────────────────────────────────

export async function createEventAction(
  input: CreateEventInput
): Promise<{ data: Event | null; error: string | null }> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const db = createServiceClient();

  const { data, error } = await db
    .from("events")
    .insert({
      org_id: input.org_id,
      name: input.name.trim(),
      event_type: input.event_type,
      status: input.status,
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23514" && error.message.includes("events_date_order")) {
      return { data: null, error: "MSG22: End date cannot be earlier than the start date." };
    }
    return { data: null, error: error.message };
  }

  return { data: data as Event, error: null };
}

// ── Event Assignment ──────────────────────────────────────────────

export async function assignEmployeeAction(
  input: AssignEmployeeInput
): Promise<{ data: EventAssignment | null; error: string | null }> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const db = createServiceClient();

  const { data, error } = await db
    .from("event_assignments")
    .insert({
      event_id: input.event_id,
      user_id: input.user_id,
      assigned_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "This employee is already assigned to the event." };
    }
    return { data: null, error: error.message };
  }

  return { data: data as EventAssignment, error: null };
}

export async function removeEventAssignmentAction(
  assignmentId: string
): Promise<{ error: string | null }> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const db = createServiceClient();

  const { error } = await db
    .from("event_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) return { error: error.message };
  return { error: null };
}
