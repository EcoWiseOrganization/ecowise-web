"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_ADMIN_ID, ROLE_MEMBER_ID } from "@/lib/roles";
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  Event,
} from "@/types/database.types";
import type { CreateOrganizationInput } from "@/services/organizationService";
import type { CreateEventInput } from "@/services/eventService";

// ── Server-side reads ─────────────────────────────────────────────

export async function getMyOrganizationsServer(): Promise<Organization[]> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return [];

  const db = createServiceClient();
  const { data } = await db
    .from("Organization")
    .select("*, OrganizationMembers!inner(user_id, status)")
    .eq("OrganizationMembers.user_id", user.id)
    .eq("OrganizationMembers.status", "Active")
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as (Organization & { OrganizationMembers: unknown[] })[]).map(
    ({ OrganizationMembers: _m, ...org }) => org as Organization
  );
}

export async function getOrganizationByIdServer(orgId: string): Promise<Organization | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Organization")
    .select("*")
    .eq("id", orgId)
    .single();
  if (error) return null;
  return data as Organization;
}

export async function getOrganizationMembersServer(orgId: string): Promise<OrganizationMemberWithUser[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("OrganizationMembers")
    .select(`id, org_id, user_id, role_id, status, created_at, user:User ( id, full_name, user_name, email )`)
    .eq("org_id", orgId)
    .eq("status", "Active")
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as OrganizationMemberWithUser[];
}

export async function getMyMembershipServer(orgId: string, userId: string): Promise<OrganizationMember | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("OrganizationMembers")
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
    .from("Events")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Event[];
}

export async function getEventByIdServer(eventId: string): Promise<Event | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error) return null;
  return data as Event;
}

// ── Mutations ─────────────────────────────────────────────────────

export async function createOrganizationAction(
  input: CreateOrganizationInput
): Promise<{ data: Organization | null; error: string | null }> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const db = createServiceClient();

  const { data: org, error: orgError } = await db
    .from("Organization")
    .insert({
      legal_name: input.legal_name.trim(),
      tax_code: input.tax_code.trim(),
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

  const { error: memberError } = await db
    .from("OrganizationMembers")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role_id: ROLE_ADMIN_ID,
      status: "Active",
      created_by: user.id,
    });

  if (memberError) {
    return { data: null, error: `Organization created but could not assign admin role: ${memberError.message}` };
  }

  return { data: org as Organization, error: null };
}

export async function createEventAction(
  input: CreateEventInput
): Promise<{ data: Event | null; error: string | null }> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const db = createServiceClient();

  const { data, error } = await db
    .from("Events")
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

// ── Add org members ───────────────────────────────────────────────

export interface MemberAddResult {
  email: string;
  status: "created" | "existing_added" | "already_member" | "error";
  error?: string;
}

export async function addOrgMembersAction(
  emails: string[],
  orgId: string
): Promise<{ results: MemberAddResult[]; error: string | null }> {
  const authClient = await createClient();
  const { data: { user: caller } } = await authClient.auth.getUser();
  if (!caller) return { results: [], error: "Not authenticated." };

  const db = createServiceClient();
  const { data: callerMembership } = await db
    .from("OrganizationMembers")
    .select("role_id")
    .eq("org_id", orgId)
    .eq("user_id", caller.id)
    .single();

  if (callerMembership?.role_id !== ROLE_ADMIN_ID) {
    return { results: [], error: "Only Organization Admins can add members." };
  }

  const admin = createAdminClient();
  const results: MemberAddResult[] = [];

  for (const rawEmail of emails) {
    const email = rawEmail.trim().toLowerCase();
    if (!email) continue;

    try {
      const { data: existingProfile } = await db
        .from("User")
        .select("id")
        .eq("email", email)
        .single();

      let userId: string;
      let isNewUser = false;

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password: "123456",
          email_confirm: true,
        });

        if (authError) {
          results.push({ email, status: "error", error: authError.message });
          continue;
        }

        userId = authData.user.id;
        isNewUser = true;

        const userName = email.split("@")[0];
        await db.from("User").upsert({
          id: userId,
          email,
          user_name: userName,
          full_name: userName,
          is_admin: false,
          status: "active",
          green_points: 0,
        }, { onConflict: "id" });
      }

      const { data: existingMembership } = await db
        .from("OrganizationMembers")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .single();

      if (existingMembership) {
        results.push({ email, status: "already_member" });
        continue;
      }

      const { error: memberError } = await db
        .from("OrganizationMembers")
        .insert({
          org_id: orgId,
          user_id: userId,
          role_id: ROLE_MEMBER_ID,
          status: "Active",
          created_by: caller.id,
        });

      if (memberError) {
        results.push({ email, status: "error", error: memberError.message });
        continue;
      }

      results.push({ email, status: isNewUser ? "created" : "existing_added" });
    } catch (err) {
      results.push({
        email,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results, error: null };
}
