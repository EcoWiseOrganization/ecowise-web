/**
 * event.service.ts
 * All Supabase calls related to Events.
 * Uses the browser (client-side) Supabase client.
 */

import { createClient } from "@/lib/supabase/client";
import type { Event, CreateEventInput } from "@/types/event.types";

// ── Event CRUD ───────────────────────────────────────────────────

export async function createEvent(
  input: CreateEventInput,
  userId: string
): Promise<Event> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Events")
    .insert({
      org_id: input.org_id,
      name: input.name.trim(),
      event_type: input.event_type,
      status: input.status,
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (
      error.code === "23514" &&
      error.message.includes("events_date_order")
    ) {
      throw new Error(
        "MSG22: End date cannot be earlier than the start date. Please select a valid date range."
      );
    }
    throw new Error(error.message);
  }

  return data as Event;
}

export async function getEventsByOrg(orgId: string): Promise<Event[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Events")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Event[];
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Event;
}
