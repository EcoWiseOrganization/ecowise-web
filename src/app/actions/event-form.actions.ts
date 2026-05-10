"use server";

/**
 * Server actions for the public event-form builder (Phase 5 — UC-33).
 * All mutations require Org Admin role on the form's organization.
 */

import { revalidatePath } from "next/cache";
import { requireOrgRole, AuthError } from "@/lib/auth/roles";
import {
  getFormByEventId,
  getRecentSubmissions,
  rotateFormToken,
  upsertForm,
} from "@/services/event-form.service";
import { getEventByIdServer } from "@/app/actions/organization.actions";
import type {
  EventPublicForm,
  EventPublicSubmission,
  UpsertEventPublicFormInput,
} from "@/types/event-form.types";

export async function getEventFormAction(
  orgId: string,
  eventId: string
): Promise<{ data: EventPublicForm | null; error: string | null }> {
  try {
    await requireOrgRole(orgId);
    const data = await getFormByEventId(eventId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function upsertEventFormAction(
  orgId: string,
  eventId: string,
  input: UpsertEventPublicFormInput
): Promise<{ data: EventPublicForm | null; error: string | null }> {
  try {
    const ctx = await requireOrgRole(orgId, { adminOnly: true });
    const event = await getEventByIdServer(eventId);
    if (!event || event.org_id !== orgId) {
      return { data: null, error: "EVENT_NOT_FOUND" };
    }
    const data = await upsertForm({
      eventId,
      orgId,
      userId: ctx.userId,
      input,
    });
    revalidatePath(
      `/dashboard/organization/${orgId}/events/${eventId}/form-builder`
    );
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function rotateEventFormTokenAction(
  orgId: string,
  eventId: string
): Promise<{ data: EventPublicForm | null; error: string | null }> {
  try {
    await requireOrgRole(orgId, { adminOnly: true });
    const existing = await getFormByEventId(eventId);
    if (!existing) return { data: null, error: "FORM_NOT_FOUND" };
    const updated = await rotateFormToken(existing.id);
    revalidatePath(
      `/dashboard/organization/${orgId}/events/${eventId}/form-builder`
    );
    return { data: updated, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getRecentSubmissionsAction(
  orgId: string,
  eventId: string
): Promise<{ data: EventPublicSubmission[]; error: string | null }> {
  try {
    await requireOrgRole(orgId);
    const form = await getFormByEventId(eventId);
    if (!form) return { data: [], error: null };
    const subs = await getRecentSubmissions(form.id);
    return { data: subs, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}
