export type EventType = "Conference" | "Festival" | "Webinar" | "Workshop" | "Other";
export type EventStatus = "Active" | "Scheduled" | "Completed";

export interface Event {
  id: string;
  org_id: string;
  name: string;
  event_type: EventType;
  status: EventStatus;
  start_date: string; // ISO date string "YYYY-MM-DD"
  end_date: string;
  created_at: string;
  created_by: string;
}

export interface CreateEventInput {
  org_id: string;
  name: string;
  event_type: EventType;
  status: EventStatus;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
}
