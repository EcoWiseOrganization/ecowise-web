/**
 * Server-only service for public event forms (Phase 5 — UC-21, UC-33).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_PUBLIC_FORM_FIELDS } from "@/lib/event-form";
import type {
  EventPublicForm,
  EventPublicSubmission,
  UpsertEventPublicFormInput,
} from "@/types/event-form.types";

export async function getFormByEventId(
  eventId: string
): Promise<EventPublicForm | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("EventPublicForms")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  return (data as EventPublicForm) ?? null;
}

export async function getFormByToken(
  token: string
): Promise<EventPublicForm | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("EventPublicForms")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as EventPublicForm) ?? null;
}

/**
 * Idempotent upsert: each event has at most one form. Calling this with a
 * brand-new event creates the form with default fields; subsequent calls
 * patch metadata only (token never rotates unless explicitly requested).
 */
export async function upsertForm(params: {
  eventId: string;
  orgId: string;
  userId: string;
  input: UpsertEventPublicFormInput;
}): Promise<EventPublicForm> {
  const db = createServiceClient();
  const existing = await getFormByEventId(params.eventId);

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (params.input.welcome_message !== undefined)
      patch.welcome_message = params.input.welcome_message;
    if (params.input.brand_color !== undefined)
      patch.brand_color = params.input.brand_color;
    if (params.input.status !== undefined) patch.status = params.input.status;
    if (params.input.fields !== undefined) patch.fields = params.input.fields;

    if (Object.keys(patch).length === 0) return existing;

    const { data, error } = await db
      .from("EventPublicForms")
      .update(patch)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as EventPublicForm;
  }

  const { data, error } = await db
    .from("EventPublicForms")
    .insert({
      event_id: params.eventId,
      org_id: params.orgId,
      fields: params.input.fields ?? DEFAULT_PUBLIC_FORM_FIELDS,
      welcome_message: params.input.welcome_message ?? null,
      brand_color: params.input.brand_color ?? null,
      status: params.input.status ?? "Draft",
      created_by: params.userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EventPublicForm;
}

/** Rotate token — useful when admin suspects link leakage. */
export async function rotateFormToken(
  formId: string
): Promise<EventPublicForm> {
  const db = createServiceClient();
  // Generate the new token in-process. The previous implementation
  // first called `db.rpc("uuid_generate_v4")` and fell back to
  // `crypto.randomUUID()` — but `uuid_generate_v4` isn't exposed as
  // a Postgres RPC by default on Supabase, so the RPC ALWAYS errored
  // and the fallback was the actual code path. Web Crypto's
  // `randomUUID()` is cryptographically strong + universally
  // available on Node 19+ / edge / browsers, so we use it directly.
  const newToken = crypto.randomUUID();
  const { data: row, error: updateErr } = await db
    .from("EventPublicForms")
    .update({ token: newToken })
    .eq("id", formId)
    .select()
    .single();
  if (updateErr) throw new Error(updateErr.message);
  return row as EventPublicForm;
}

export async function getRecentSubmissions(
  formId: string,
  limit = 25
): Promise<EventPublicSubmission[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EventPublicSubmissions")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as EventPublicSubmission[];
}
