import type { User } from "./user.types";

export type OrgType = "Enterprise" | "SMB" | "NGO" | "Startup";
export type MemberRole = "Organization Admin" | "Standard Member";
export type MemberStatus = "Active" | "Pending";

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
