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
  legal_name: string | null;
  tax_code: string | null;
  org_type: OrgType | null;
  owner_id: string | null;
  address: string | null;
  contact_email: string | null;
  logo_url: string | null;
  created_at: string;
  created_by: string | null;
}

export interface OrganizationMember {
  id: string;
  org_id: string | null;
  user_id: string | null;
  role_id: string | null;
  status: MemberStatus | null;
  created_at: string | null;
  created_by: string | null;
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

