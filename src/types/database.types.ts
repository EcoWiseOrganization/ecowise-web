export interface User {
  id: string;
  email: string;
  full_name: string | null;
  user_name: string | null;
  is_admin: boolean;
  status: string;
  green_points: number;
  created_at: string;
}

// ── Organization & Event types ──────────────────────────────────

export type OrgType = "Enterprise" | "SMB" | "NGO" | "Startup";
export type MemberRole = "Organization Admin" | "Standard Member";
export type MemberStatus = "Active" | "Pending";
export type EventType = "Conference" | "Festival" | "Webinar" | "Workshop" | "Other";
export type EventStatus = "Active" | "Scheduled" | "Completed";

export interface Organization {
  id: string;
  name: string;
  tax_code: string;
  industry: string;
  org_type: OrgType;
  created_at: string;
  created_by: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
}

/** OrganizationMember joined with public.User data (for display in lists) */
export interface OrganizationMemberWithUser extends OrganizationMember {
  user: Pick<User, "id" | "full_name" | "user_name" | "email">;
}

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

export interface EventAssignment {
  id: string;
  event_id: string;
  user_id: string;
  assigned_by: string;
  created_at: string;
}

/** EventAssignment joined with public.User data */
export interface EventAssignmentWithUser extends EventAssignment {
  user: Pick<User, "id" | "full_name" | "user_name" | "email">;
}
