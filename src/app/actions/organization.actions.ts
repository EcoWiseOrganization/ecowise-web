"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_ADMIN_ID, ROLE_MEMBER_ID } from "@/lib/roles";
import { sendEmail, orgInviteEmail } from "@/lib/emails";
import { getEventCapacity } from "@/services/org-admin.service";
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithUser,
  CreateOrganizationInput,
  MemberAddResult,
} from "@/types/organization.types";
import type { Event, CreateEventInput } from "@/types/event.types";

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

/**
 * Fetch a single event by id. The caller MUST pass the org id from their URL
 * so we can verify the event actually belongs to that tenant — otherwise an
 * authenticated user could guess the `(orgId, eventId)` pair in their URL
 * and see another org's events (the service client bypasses RLS).
 *
 * Returns `null` for both "not found" and "wrong org" so callers can simply
 * `notFound()` on null.
 */
export async function getEventByIdServer(
  eventId: string,
  orgId: string,
): Promise<Event | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Events")
    .select("*")
    .eq("id", eventId)
    .eq("org_id", orgId)
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

  // 1. Caller must be an Active Org Admin of the SAME org as `input.org_id`
  //    — the service-role client bypasses RLS so a hand-crafted action
  //    payload could otherwise create events in other tenants.
  const { data: callerMembership } = await db
    .from("OrganizationMembers")
    .select("role_id, status")
    .eq("org_id", input.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    !callerMembership ||
    callerMembership.status !== "Active" ||
    callerMembership.role_id !== ROLE_ADMIN_ID
  ) {
    return { data: null, error: "Only Organization Admins can create events." };
  }

  // 2. BR-09 quota: blocked when current >= plan.max_events. Free / no-plan
  //    orgs have max_events=0 per migration 012 seeds and will get MSG06.
  const capacity = await getEventCapacity(input.org_id);
  if (capacity.blocked) {
    return {
      data: null,
      error: `MSG06: Event quota reached (${capacity.current}/${capacity.max}). Upgrade your plan to add more.`,
    };
  }

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
        // Generate a cryptographically random throwaway password. We never
        // email it; we just need *some* credential so the auth row exists.
        // The user activates the account via a recovery link below, which
        // forces them to set their own password.
        const tempPassword = randomBytes(32).toString("base64url");
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
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

        // Fire-and-forget: generate a password-recovery link and email it
        // to the invitee. If link generation or email delivery fails the
        // invite still succeeds — the user can recover via the public
        // forgot-password flow with the same email. We DO NOT block the
        // batch on email failure.
        try {
          const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
          const { data: linkData } = await admin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: siteUrl
              ? { redirectTo: `${siteUrl}/forgot-password/reset` }
              : undefined,
          });
          const setupUrl =
            linkData?.properties?.action_link ??
            `${siteUrl || ""}/forgot-password`;
          const { data: orgRow } = await db
            .from("Organization")
            .select("legal_name")
            .eq("id", orgId)
            .single();
          const orgName = orgRow?.legal_name ?? "EcoWise";
          const tmpl = orgInviteEmail({ orgName, email, setupUrl });
          await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html });
        } catch (emailErr) {
          console.error(
            "[addOrgMembersAction] invite email failed for",
            email,
            emailErr,
          );
        }
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
