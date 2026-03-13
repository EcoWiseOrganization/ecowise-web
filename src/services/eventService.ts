/**
 * eventService.ts
 * All Supabase calls related to Events and Event Assignments.
 * Uses the browser (client-side) Supabase client.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  Event,
  EventAssignment,
  EventAssignmentWithUser,
  EventType,
  EventStatus,
} from "@/types/database.types";

// ── Input DTOs ───────────────────────────────────────────────────

export interface CreateEventInput {
  org_id: string;
  name: string;
  event_type: EventType;
  status: EventStatus;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
}

export interface AssignEmployeeInput {
  event_id: string;
  user_id: string;   // the employee being assigned
  assigned_by: string;
}

// ── Event CRUD ───────────────────────────────────────────────────

/**
 * Creates a new event for an organization.
 * App-layer validates end_date >= start_date (MSG22) before calling this.
 */
export async function createEvent(
  input: CreateEventInput,
  userId: string
): Promise<Event> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
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
    // Surface the DB-level date constraint as a friendly message
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

/**
 * Fetches all events for a given organization, ordered newest first.
 */
export async function getEventsByOrg(orgId: string): Promise<Event[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Event[];
}

/**
 * Fetches a single event by id.
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Event;
}

// ── Event Assignments ────────────────────────────────────────────

/**
 * Assigns an employee (org member) to an event.
 * Throws a descriptive error if the assignment already exists (duplicate).
 */
export async function assignEmployeeToEvent(
  input: AssignEmployeeInput
): Promise<EventAssignment> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("event_assignments")
    .insert({
      event_id: input.event_id,
      user_id: input.user_id,
      assigned_by: input.assigned_by,
    })
    .select()
    .single();

  if (error) {
    // PostgreSQL unique-violation code
    if (error.code === "23505") {
      throw new Error(
        "This employee is already assigned to the event."
      );
    }
    throw new Error(error.message);
  }

  return data as EventAssignment;
}

/**
 * Fetches all assignments for an event, joined with user profile data.
 */
export async function getEventAssignments(
  eventId: string
): Promise<EventAssignmentWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("event_assignments")
    .select(`
      id,
      event_id,
      user_id,
      assigned_by,
      created_at,
      user:User ( id, full_name, user_name, email )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EventAssignmentWithUser[];
}

/**
 * Removes an assignment by id.
 */
export async function removeEventAssignment(
  assignmentId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("event_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) throw new Error(error.message);
}
