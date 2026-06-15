import type { User } from "./user.types";

export type OrgType = "Enterprise" | "SME" | "NGO" | "Startup";
export type MemberRole = "Organization Admin" | "Standard Member";
export type MemberStatus = "Active" | "Pending" | "Inactive";
export type OrgVerificationStatus = "Pending" | "Verified" | "Suspended";

export interface Organization {
  id: string;
  legal_name: string | null;
  tax_code: string | null;
  org_type: OrgType | null;
  owner_id: string | null;
  industry: string | null;
  website_url: string | null;
  address: string | null;
  contact_email: string | null;
  logo_url: string | null;
  verification_status: OrgVerificationStatus | null;
  max_users: number | null;
  max_events: number | null;
  created_at: string;
  created_by: string | null;
}

export interface UpdateOrganizationInput {
  legal_name?: string;
  org_type?: OrgType;
  industry?: string;
  website_url?: string;
  address?: string;
  contact_email?: string;
  logo_url?: string;
}

export interface OrgMetricsSummary {
  totalEmissionsKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  activeEmployees: number;
  pendingMembers: number;
  activeEvents: number;
  totalEvents: number;
  pendingReviews: number;
}

export interface EmployeeActivityRow {
  user_id: string;
  full_name: string | null;
  email: string;
  role_id: string;
  status: MemberStatus;
  total_logs: number;
  total_co2e_kg: number;
  last_activity_at: string | null;
}

export interface InviteCapacity {
  current: number;
  max: number;
  remaining: number;
  blocked: boolean;
}

/** Mirror of InviteCapacity, scoped to event creation (BR-09 `max_events`). */
export type EventCapacity = InviteCapacity;

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

export interface CreateOrganizationInput {
  legal_name: string;
  tax_code: string;
  org_type: OrgType;
}

export interface MemberAddResult {
  email: string;
  status: "created" | "existing_added" | "already_member" | "error";
  error?: string;
}
